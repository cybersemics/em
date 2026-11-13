import { neon } from '@neondatabase/serverless'
import FeedbackPayload from '../shared/FeedbackPayload'
import FeedbackRecord from './FeedbackRecord'

/** Opens the configured database lazily so importing the app requires no credentials. */
const sql = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  return neon(process.env.DATABASE_URL)
}

/** Reads an upload session. Callers must authorize it before returning any contents. */
const get = async (id: string): Promise<FeedbackRecord | undefined> =>
  (await sql()`SELECT * FROM feedback WHERE id = ${id}::uuid`)[0] as FeedbackRecord | undefined

/** Reserves a submission id once, preserving the original contents on retries. */
const reserve = async (id: string, tokenHash: string, payloadHash: string, payload: FeedbackPayload) => {
  await sql()`INSERT INTO feedback (id, token_hash, payload_hash, payload)
    VALUES (${id}::uuid, ${tokenHash}, ${payloadHash}, ${JSON.stringify(payload)}::jsonb)
    ON CONFLICT (id) DO NOTHING`
  return get(id)
}

/** Marks a verified upload session submitted, without creating a duplicate on retries. */
const submit = async (id: string) => {
  await sql()`UPDATE feedback SET submitted_at = COALESCE(submitted_at, now()) WHERE id = ${id}::uuid`
}

/** Lists bounded summaries without large text attachments. Timestamp text preserves microseconds for exact pagination boundaries. */
const list = async (limit: number, before?: { date: string; id: string }) =>
  sql()`SELECT id,
      to_char(submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS submitted_at,
      payload->>'name' AS name, payload->>'email' AS email,
      left(payload->>'message', 200) AS message,
      jsonb_array_length(payload->'files') AS file_count
    FROM feedback WHERE submitted_at IS NOT NULL
      AND (${!before} OR (submitted_at, id) <
        (${before?.date ?? '9999-01-01T00:00:00Z'}::timestamptz,
         ${before?.id ?? '00000000-0000-0000-0000-000000000000'}::uuid))
    ORDER BY feedback.submitted_at DESC, id DESC LIMIT ${limit}`

/** Finds abandoned upload sessions; completed feedback is never expired. */
const expired = async (): Promise<{ id: string; files: FeedbackPayload['files'] }[]> =>
  (await sql()`SELECT id, payload->'files' AS files FROM feedback WHERE submitted_at IS NULL
    AND created_at < now() - interval '1 day' ORDER BY created_at LIMIT 100`) as {
    id: string
    files: FeedbackPayload['files']
  }[]

/** Removes an abandoned session only after its blobs have been cleaned up. */
const removeExpired = async (id: string) => {
  await sql()`DELETE FROM feedback WHERE id = ${id}::uuid AND submitted_at IS NULL
    AND created_at < now() - interval '1 day'`
}

const feedbackDatabase = { get, reserve, submit, list, expired, removeExpired }

export default feedbackDatabase
