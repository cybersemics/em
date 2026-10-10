// Save the model of each Cursor agent prompt where .hooks/commit-msg.mjs can find it. Cursor gives
// the model only to its hooks, not to the agent's shell, so the commit hook looks this record up by
// the CURSOR_CONVERSATION_ID and CURSOR_REQUEST_ID its shell does carry.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

try {
  const payload = JSON.parse(readFileSync(0, 'utf8'))
  if (payload.conversation_id && payload.generation_id) {
    const cache = execFileSync('git', ['rev-parse', '--git-path', 'cursor-attribution-cache'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    mkdirSync(cache, { recursive: true })
    writeFileSync(
      join(cache, `${createHash('sha256').update(payload.conversation_id).digest('hex')}.json`),
      JSON.stringify({
        generation_id: payload.generation_id,
        model: payload.model,
        model_id: payload.model_id,
        model_params: payload.model_params,
      }),
    )
  }
} catch {
  // Saving the model must not interrupt a prompt.
}

process.stdout.write(JSON.stringify({ continue: true }))
