import { BlobNotFoundError, del, get, head } from '@vercel/blob'
import { HandleUploadBody, handleUpload } from '@vercel/blob/client'
import { checkRateLimit } from '@vercel/firewall'
import cors from 'cors'
import express, { NextFunction, Request, RequestHandler, Response } from 'express'
import { createHash, timingSafeEqual } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { ZodError, z } from 'zod'
import feedbackConfig from '../shared/feedbackConfig'
import FeedbackRecord from './FeedbackRecord'
import feedbackDatabase from './feedbackDatabase'

const UPLOAD_SESSION_DURATION = 15 * 60 * 1000
const credentialSchema = z.object({ id: z.uuid(), token: z.uuid() })
const payloadSchema = z.strictObject({
  name: z.string().trim().max(200),
  email: z.union([z.email().max(254), z.literal('')]),
  message: z.string().trim().min(1).max(feedbackConfig.maxMessageLength),
  thoughts: z.string().max(feedbackConfig.maxTextAttachmentLength).optional(),
  debugLog: z.string().max(feedbackConfig.maxTextAttachmentLength).optional(),
  metadata: z.strictObject({
    version: z.string().max(100),
    commit: z.string().max(100),
    userAgent: z.string().max(1000),
    platform: z.string().max(100),
    resolution: z
      .strictObject({
        width: z.number().int().positive().max(100000),
        height: z.number().int().positive().max(100000),
        pixelRatio: z.number().positive().max(100),
      })
      .optional(),
  }),
  files: z
    .array(
      z
        .strictObject({
          name: z
            .string()
            .min(1)
            .max(200)
            .regex(/^[^/\\\x00-\x1f\x7f]+$/),
          size: z.number().int().positive().max(feedbackConfig.maxFileSize),
          contentType: z.string(),
        })
        .refine(
          file => feedbackConfig.fileTypes[file.name.split('.').pop()!.toLowerCase()] === file.contentType,
          'Unsupported attachment type',
        ),
    )
    .max(feedbackConfig.maxFiles)
    .refine(
      files => files.reduce((sum, file) => sum + file.size, 0) <= feedbackConfig.maxTotalSize,
      'Attachments exceed 25 MB combined',
    ),
})

/** An HTTP failure safe to return without exposing request contents or service credentials. */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Hashes secrets and payloads without persisting the upload credential itself. */
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

/** Compares fixed-length digests so secret comparison does not disclose matching prefixes. */
const matches = (value: string, digest: string) => timingSafeEqual(Buffer.from(hash(value)), Buffer.from(digest))

/** Handles rejected async Express handlers through the common error boundary. */
const route =
  (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void handler(req, res).catch(next)
  }

/** Checks the Vercel firewall before a public write, failing closed if it cannot be checked. */
const limit = async (req: Request, rule: string) => {
  if (process.env.NODE_ENV !== 'production') return
  try {
    const { rateLimited, error } = await checkRateLimit(rule, {
      headers: req.headers as Record<string, string | string[]>,
    })
    if (rateLimited) throw new HttpError(429, 'Too many requests. Please try again later.')
    if (error) throw new Error('Feedback rate limit check failed')
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(503, 'Feedback is temporarily unavailable. Please try again later.')
  }
}

/** Authorizes an upload session and rejects unfinished sessions whose tokens have expired. */
const session = async (input: unknown) => {
  const { id, token } = credentialSchema.parse(input)
  const record = await feedbackDatabase.get(id)
  if (!record || !matches(token, record.token_hash)) throw new HttpError(403, 'Invalid upload session')
  if (!record.submitted_at && Date.now() > new Date(record.created_at).getTime() + UPLOAD_SESSION_DURATION)
    throw new HttpError(410, 'Upload session expired. Please send your feedback again.')
  return record
}

/** Derives an immutable storage path from the reserved manifest, never from a caller-supplied URL. */
const pathname = (id: string, index: number) => `feedback/${id}/${index}`

/** Verifies that a reserved file exists in the private store and matches its declared size and type. */
const uploadedFile = async (record: FeedbackRecord, index: number) => {
  try {
    const blob = await head(pathname(record.id, index))
    const file = record.payload.files[index]
    if (
      blob.size !== file.size ||
      blob.contentType.split(';')[0] !== file.contentType ||
      !new URL(blob.url).hostname.endsWith('.private.blob.vercel-storage.com')
    )
      throw new HttpError(400, 'Uploaded attachment does not match the selected file')
    return blob
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null
    throw error
  }
}

/** Requires the configured server-only secret for maintainer or scheduled access. */
const authorize = (req: Request, secret: string | undefined) => {
  if (!secret) throw new HttpError(503, 'Service is not configured')
  if (!matches(req.headers.authorization ?? '', hash(`Bearer ${secret}`))) throw new HttpError(401, 'Unauthorized')
}

const app = express()
app.disable('x-powered-by')
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
app.use('/feedback', cors())
// Count malformed and oversized reservations too, before parsing their bodies.
app.post('/feedback', (req, _res, next) => {
  void limit(req, 'feedback-submissions').then(() => next(), next)
})
app.use(express.json({ limit: '3mb' }))
app.get('/', (_req, res) => {
  res.type('text').send('Server is running')
})

app.post(
  '/feedback',
  route(async (req, res) => {
    const { id, token, payload } = z
      .strictObject({
        id: z.uuid(),
        token: z.uuid(),
        payload: payloadSchema,
      })
      .parse(req.body)
    const payloadHash = hash(JSON.stringify(payload))
    const record = await feedbackDatabase.reserve(id, hash(token), payloadHash, payload)
    if (!record || !matches(token, record.token_hash) || record.payload_hash !== payloadHash)
      throw new HttpError(409, 'Submission id is already in use')
    await session({ id, token })
    const uploaded = await Promise.all(record.payload.files.map((_, index) => uploadedFile(record, index)))
    res.status(200).json({
      id,
      submitted: !!record.submitted_at,
      files: uploaded.map((blob, index) => ({ pathname: pathname(id, index), uploaded: !!blob })),
    })
  }),
)

app.post(
  '/feedback/upload',
  route(async (req, res) => {
    // handleUpload verifies Blob's completion callback signature itself. Public token requests are rate-limited below.
    const result = await handleUpload({
      body: req.body as HandleUploadBody,
      request: req,
      onBeforeGenerateToken: async (requestedPath, clientPayload, multipart) => {
        await limit(req, 'feedback-uploads')
        const input = z
          .object({ id: z.uuid(), token: z.uuid(), index: z.number().int().min(0).max(4) })
          .parse(JSON.parse(clientPayload || '{}'))
        const record = await session(input)
        const file = record.payload.files[input.index]
        if (record.submitted_at || !file || multipart || requestedPath !== pathname(record.id, input.index))
          throw new HttpError(403, 'Upload is not authorized')
        return {
          addRandomSuffix: false,
          allowOverwrite: false,
          allowedContentTypes: [file.contentType],
          maximumSizeInBytes: file.size,
          validUntil: new Date(record.created_at).getTime() + UPLOAD_SESSION_DURATION,
          tokenPayload: '{}',
        }
      },
      // Completion is explicitly verified with head() below, including on localhost where webhooks cannot arrive.
      onUploadCompleted: async () => {},
    })
    res.json(result)
  }),
)

app.post(
  '/feedback/:id/complete',
  route(async (req, res) => {
    await limit(req, 'feedback-uploads')
    const record = await session({ id: req.params.id, token: req.body.token })
    if (!record.submitted_at) {
      const files = await Promise.all(record.payload.files.map((_, index) => uploadedFile(record, index)))
      if (files.some(file => !file))
        throw new HttpError(409, 'Some attachments have not finished uploading. Please retry.')
      await feedbackDatabase.submit(record.id)
    }
    res.json({ id: record.id, submitted: true })
  }),
)

app.get(
  '/feedback',
  route(async (req, res) => {
    authorize(req, process.env.FEEDBACK_READ_SECRET)
    const { limit: pageSize, cursor } = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        cursor: z.string().max(500).optional(),
      })
      .parse(req.query)
    const before = cursor
      ? z
          .object({ date: z.iso.datetime(), id: z.uuid() })
          .parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()))
      : undefined
    const records = await feedbackDatabase.list(pageSize + 1, before)
    const items = records.slice(0, pageSize)
    const last = items.at(-1)
    res.json({
      items,
      nextCursor:
        records.length > pageSize && last
          ? Buffer.from(JSON.stringify({ date: last.submitted_at, id: last.id })).toString('base64url')
          : null,
    })
  }),
)

app.get(
  '/feedback/:id',
  route(async (req, res) => {
    authorize(req, process.env.FEEDBACK_READ_SECRET)
    const record = await feedbackDatabase.get(z.uuid().parse(req.params.id))
    if (!record?.submitted_at) throw new HttpError(404, 'Feedback not found')
    res.json({
      id: record.id,
      submittedAt: record.submitted_at,
      ...record.payload,
      files: record.payload.files.map((file, index) => ({
        ...file,
        downloadPath: `/feedback/${record.id}/files/${index}`,
      })),
    })
  }),
)

app.get(
  '/feedback/:id/files/:index',
  route(async (req, res) => {
    authorize(req, process.env.FEEDBACK_READ_SECRET)
    const id = z.uuid().parse(req.params.id)
    const index = z.coerce.number().int().min(0).max(4).parse(req.params.index)
    const record = await feedbackDatabase.get(id)
    if (!record?.submitted_at || !record.payload.files[index]) throw new HttpError(404, 'Attachment not found')
    const blob = await uploadedFile(record, index)
    if (!blob) throw new HttpError(404, 'Attachment not found')
    const file = await get(blob.url, { access: 'private', useCache: false })
    if (!file || file.statusCode !== 200) throw new HttpError(404, 'Attachment not found')
    res.set('Content-Type', 'application/octet-stream')
    res.set('X-Content-Type-Options', 'nosniff')
    res.set(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(record.payload.files[index].name).replace(
        /['()*]/g,
        character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      )}`,
    )
    await pipeline(Readable.fromWeb(file.stream as import('node:stream/web').ReadableStream), res)
  }),
)

app.get(
  '/internal/cleanup',
  route(async (req, res) => {
    authorize(req, process.env.CRON_SECRET)
    const records = await feedbackDatabase.expired()
    await Promise.all(
      records.map(async record => {
        const paths = record.files.map((_, index) => pathname(record.id, index))
        if (paths.length) await del(paths)
        await feedbackDatabase.removeExpired(record.id)
      }),
    )
    res.json({ removed: records.length })
  }),
)

/** Converts validation, payload-size and service failures to bounded, non-sensitive responses. */
const onError = (error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error)
    return
  }
  const tooLarge = typeof error === 'object' && error && 'type' in error && error.type === 'entity.too.large'
  const status =
    error instanceof HttpError
      ? error.status
      : tooLarge
        ? 413
        : error instanceof ZodError || error instanceof SyntaxError
          ? 400
          : 500
  const message =
    error instanceof HttpError
      ? error.message
      : tooLarge
        ? 'Feedback data is too large'
        : status === 400
          ? 'Invalid feedback data'
          : 'Could not send feedback. Please try again.'
  if (status === 429 || status === 503) res.set('Retry-After', '600')
  if (status === 500)
    console.error('Feedback service request failed', error instanceof Error ? error.name : 'unknown error')
  res.status(status).json({ error: message })
}
app.use(onError)

export default app
