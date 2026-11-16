import { BlobNotFoundError } from '@vercel/blob'
import { createHash } from 'node:crypto'
import { Server } from 'node:http'
import { AddressInfo } from 'node:net'
import FeedbackPayload from '../../shared/FeedbackPayload'
import FeedbackRecord from '../FeedbackRecord'
import app from '../index'

const mocks = vi.hoisted(() => ({
  database: {
    get: vi.fn(),
    reserve: vi.fn(),
    submit: vi.fn(),
    list: vi.fn(),
    expired: vi.fn(),
    removeExpired: vi.fn(),
  },
  head: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  rateLimit: vi.fn(),
}))
vi.mock('../feedbackDatabase', () => ({ default: mocks.database }))
vi.mock('@vercel/firewall', () => ({ checkRateLimit: mocks.rateLimit }))
vi.mock('@vercel/blob', async importOriginal => ({
  ...(await importOriginal<typeof import('@vercel/blob')>()),
  head: mocks.head,
  get: mocks.get,
  del: mocks.del,
}))
// The SDK's token signer requires Node without JSDOM's window. Exercise our authorization callback at that boundary.
vi.mock('@vercel/blob/client', () => ({
  handleUpload: async ({
    body,
    onBeforeGenerateToken,
  }: {
    body: { payload: { pathname: string; clientPayload: string; multipart: boolean } }
    onBeforeGenerateToken: (path: string, payload: string, multipart: boolean) => Promise<unknown>
  }) => onBeforeGenerateToken(body.payload.pathname, body.payload.clientPayload, body.payload.multipart),
}))

const id = '30e07042-a8b0-4ef7-809c-5c507b980272'
const token = '5c22ce17-f79e-454a-a10d-d59615dd9583'
const payload: FeedbackPayload = {
  name: '',
  email: '',
  message: 'A useful suggestion',
  metadata: { version: '1', commit: 'abc', userAgent: 'browser', platform: 'web' },
  files: [],
}
let server: Server
let url: string
let record: FeedbackRecord

beforeAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => {
        url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
        resolve()
      })
      server.once('error', reject)
    }),
)
afterAll(() => new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve()))))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('FEEDBACK_READ_SECRET', 'test-reader')
  vi.stubEnv('CRON_SECRET', 'test-cleanup')
  mocks.rateLimit.mockResolvedValue({ rateLimited: false })
  record = {
    id,
    token_hash: createHash('sha256').update(token).digest('hex'),
    payload_hash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
    payload: structuredClone(payload),
    created_at: new Date().toISOString(),
    submitted_at: null,
  }
  mocks.database.reserve.mockResolvedValue(record)
  mocks.database.get.mockImplementation(async () => record)
  mocks.head.mockRejectedValue(new BlobNotFoundError())
})
afterEach(vi.unstubAllEnvs)

it('accepts anonymous feedback and finalizes it without an attachment', async () => {
  const response = await fetch(`${url}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, token, payload }),
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ id, submitted: false, files: [] })
  expect(mocks.database.reserve).toHaveBeenCalledWith(id, record.token_hash, record.payload_hash, payload)
  const complete = await fetch(`${url}/feedback/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  expect(await complete.json()).toEqual({ id, submitted: true })
  expect(mocks.database.submit).toHaveBeenCalledWith(id)
})

it.each([
  { message: '   ' },
  { email: 'invalid' },
  { message: 'x'.repeat(10001) },
  { files: [{ name: 'run.exe', contentType: 'application/octet-stream', size: 100 }] },
  { files: [{ name: 'photo.png', contentType: 'image/png', size: 10 * 1024 * 1024 + 1 }] },
  { files: Array.from({ length: 6 }, () => ({ name: 'a.txt', contentType: 'text/plain', size: 1 })) },
  { files: Array.from({ length: 3 }, () => ({ name: 'a.png', contentType: 'image/png', size: 10 * 1024 * 1024 })) },
])('rejects invalid or oversized feedback before storing it: %j', async changes => {
  const response = await fetch(`${url}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, token, payload: { ...payload, ...changes } }),
  })
  expect(response.status).toBe(400)
  expect(mocks.database.reserve).not.toHaveBeenCalled()
})

it.each([
  ['rate limit exceeded', { rateLimited: true }, 429],
  ['firewall blocked the request', { rateLimited: true, error: 'blocked' }, 429],
  ['rate limit rule is missing', { rateLimited: false, error: 'not-found' }, 503],
  ['rate limiter unavailable', new Error('Unavailable'), 503],
] as const)('rejects public writes when %s', async (_name, result, status) => {
  if (result instanceof Error) mocks.rateLimit.mockRejectedValueOnce(result)
  else mocks.rateLimit.mockResolvedValueOnce(result)
  const response = await fetch(`${url}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, token, payload }),
  })
  expect(response.status).toBe(status)
  expect(mocks.database.reserve).not.toHaveBeenCalled()
})

it('rejects another upload credential without finalizing the submission', async () => {
  const response = await fetch(`${url}/feedback/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: id }),
  })
  expect(response.status).toBe(403)
  expect(mocks.database.submit).not.toHaveBeenCalled()
})

it('does not finalize missing attachments', async () => {
  record.payload.files = [{ name: 'a.png', contentType: 'image/png', size: 10 }]
  const response = await fetch(`${url}/feedback/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  expect(response.status).toBe(409)
  expect(mocks.database.submit).not.toHaveBeenCalled()
})

it('rejects a stored attachment whose actual size exceeds the reserved size', async () => {
  record.payload.files = [{ name: 'a.png', contentType: 'image/png', size: 10 }]
  mocks.head.mockResolvedValue({
    size: 100,
    contentType: 'image/png',
    url: 'https://test.private.blob.vercel-storage.com/a',
  })
  const response = await fetch(`${url}/feedback/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  expect(response.status).toBe(400)
  expect(mocks.database.submit).not.toHaveBeenCalled()
})

it('issues upload permissions only for the reserved path, type and size', async () => {
  record.payload.files = [{ name: 'a.png', contentType: 'image/png', size: 10 }]
  const response = await fetch(`${url}/feedback/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: {
        pathname: `feedback/${id}/0`,
        clientPayload: JSON.stringify({ id, token, index: 0 }),
        multipart: false,
      },
    }),
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    addRandomSuffix: false,
    allowOverwrite: false,
    allowedContentTypes: ['image/png'],
    maximumSizeInBytes: 10,
    validUntil: new Date(record.created_at).getTime() + 15 * 60 * 1000,
    tokenPayload: '{}',
  })
})

it.each(['feedback/another-submission/0', `feedback/${id}/5`])(
  'rejects an unreserved upload path %s',
  async pathname => {
    record.payload.files = [{ name: 'a.png', contentType: 'image/png', size: 10 }]
    const response = await fetch(`${url}/feedback/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: { pathname, clientPayload: JSON.stringify({ id, token, index: 0 }), multipart: false },
      }),
    })
    expect(response.status).toBe(403)
  },
)

it('rejects expired upload sessions', async () => {
  record.created_at = new Date(Date.now() - 16 * 60 * 1000).toISOString()
  const response = await fetch(`${url}/feedback/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  expect(response.status).toBe(410)
  expect(mocks.database.submit).not.toHaveBeenCalled()
})

it('returns success for a completed retry without writing it again', async () => {
  record.submitted_at = new Date().toISOString()
  const response = await fetch(`${url}/feedback/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  expect(await response.json()).toEqual({ id, submitted: true })
  expect(mocks.database.submit).not.toHaveBeenCalled()
})

it.each(['/feedback', `/feedback/${id}`, `/feedback/${id}/files/0`])('protects maintainer reads at %s', async path => {
  const response = await fetch(`${url}${path}`)
  expect(response.status).toBe(401)
  expect(mocks.database.get).not.toHaveBeenCalled()
  expect(mocks.database.list).not.toHaveBeenCalled()
})

it('returns completed details without the upload secret or hashes', async () => {
  record.submitted_at = new Date().toISOString()
  const response = await fetch(`${url}/feedback/${id}`, { headers: { Authorization: 'Bearer test-reader' } })
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(await response.json()).toEqual({ id, submittedAt: record.submitted_at, ...payload })
})

it('hides unfinished feedback even from the detail endpoint', async () => {
  const response = await fetch(`${url}/feedback/${id}`, { headers: { Authorization: 'Bearer test-reader' } })
  expect(response.status).toBe(404)
})

it('requires the cleanup secret separately from the read-only maintainer secret', async () => {
  const response = await fetch(`${url}/internal/cleanup`, { headers: { Authorization: 'Bearer test-reader' } })
  expect(response.status).toBe(401)
  expect(mocks.database.expired).not.toHaveBeenCalled()
})

it('finalizes a verified private attachment', async () => {
  record.payload.files = [{ name: 'a.png', contentType: 'image/png', size: 10 }]
  mocks.head.mockResolvedValue({
    size: 10,
    contentType: 'image/png',
    url: 'https://test.private.blob.vercel-storage.com/a',
  })
  const response = await fetch(`${url}/feedback/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ id, submitted: true })
  expect(mocks.head).toHaveBeenCalledWith(`feedback/${id}/0`)
  expect(mocks.database.submit).toHaveBeenCalledWith(id)
})

it('streams private attachments as opaque downloads', async () => {
  record.submitted_at = new Date().toISOString()
  record.payload.files = [{ name: "Bob's note.txt", contentType: 'text/plain', size: 5 }]
  mocks.head.mockResolvedValue({
    size: 5,
    contentType: 'text/plain',
    url: 'https://test.private.blob.vercel-storage.com/a',
  })
  mocks.get.mockResolvedValue({
    statusCode: 200,
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([104, 101, 108, 108, 111]))
        controller.close()
      },
    }),
  })
  const response = await fetch(`${url}/feedback/${id}/files/0`, { headers: { Authorization: 'Bearer test-reader' } })
  expect(response.headers.get('content-type')).toBe('application/octet-stream')
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  expect(response.headers.get('content-disposition')).toBe("attachment; filename*=UTF-8''Bob%27s%20note.txt")
  expect(await response.text()).toBe('hello')
})

it('paginates bounded summaries with an opaque cursor', async () => {
  mocks.database.list.mockResolvedValue([
    { id, submitted_at: '2026-10-19T00:00:00.123456Z', message: 'First' },
    { id: token, submitted_at: '2026-10-18T00:00:00.000Z', message: 'Second' },
  ])
  const response = await fetch(`${url}/feedback?limit=1`, { headers: { Authorization: 'Bearer test-reader' } })
  const data = (await response.json()) as { items: unknown[]; nextCursor: string }
  expect(data.items).toEqual([{ id, submitted_at: '2026-10-19T00:00:00.123456Z', message: 'First' }])
  expect(JSON.parse(Buffer.from(data.nextCursor, 'base64url').toString())).toEqual({
    date: '2026-10-19T00:00:00.123456Z',
    id,
  })
})

it('cleans abandoned upload paths using the cron secret', async () => {
  record.payload.files = [{ name: 'example.txt', contentType: 'text/plain', size: 5 }]
  mocks.database.expired.mockResolvedValue([{ id, files: record.payload.files }])
  const response = await fetch(`${url}/internal/cleanup`, { headers: { Authorization: 'Bearer test-cleanup' } })
  expect(await response.json()).toEqual({ removed: 1 })
  expect(mocks.del).toHaveBeenCalledWith([`feedback/${id}/0`])
  expect(mocks.database.removeExpired).toHaveBeenCalledWith(id)
})
