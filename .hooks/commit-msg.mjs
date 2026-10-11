// Add the active model and effort to commits made in a coding agent's session. Called by
// commit-msg only when one of the HARNESSES session variables is set.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, existsSync, fstatSync, openSync, readFileSync, readSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ANY_TRAILER = /^[A-Za-z0-9-]+:\s+\S/

/** Visits the records of a JSONL file from the last one back, in 256 KB chunks, and returns the first result visit gives that is not undefined. Stops reading as soon as it has one. */
const findFromEnd = (path, visit) => {
  let fd
  try {
    fd = openSync(path, 'r')
    let pos = fstatSync(fd).size
    let carry = Buffer.alloc(0)
    while (pos > 0) {
      const size = Math.min(1 << 18, pos)
      pos -= size
      const chunk = Buffer.alloc(size)
      readSync(fd, chunk, 0, size, pos)
      const buf = Buffer.concat([chunk, carry])
      // The bytes before the first newline may be a partial line, so they wait for the next chunk.
      const newline = buf.indexOf(10)
      if (pos > 0 && newline < 0) {
        carry = buf
        continue
      }
      const start = pos > 0 ? newline + 1 : 0
      carry = buf.subarray(0, start)
      const lines = buf.subarray(start).toString('utf8').split('\n')
      for (let i = lines.length - 1; i >= 0; i--) {
        let record
        try {
          record = JSON.parse(lines[i])
        } catch {
          continue
        }
        const result = visit(record)
        if (result !== undefined) return result
      }
    }
  } catch {
    // An unreadable record leaves the fields unknown.
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
  return undefined
}

/** Reads the latest model and effort recorded for a Codex session. */
const codexModelAndEffort = sessionId => {
  const sessions = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'sessions')
  const sessionFile = existsSync(sessions)
    ? readdirSync(sessions, { recursive: true }).find(file => file.endsWith(`${sessionId}.jsonl`))
    : undefined
  const context = sessionFile
    ? findFromEnd(join(sessions, sessionFile), event => (event.type === 'turn_context' ? event.payload : undefined))
    : undefined
  return { model: context?.model, effort: context?.effort }
}

/** Reads the latest model and effort recorded on a main-thread assistant message in a Claude Code session. */
const claudeModelAndEffort = sessionId => {
  const projects = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects')
  const transcript = existsSync(projects)
    ? readdirSync(projects)
        .map(project => join(projects, project, `${sessionId}.jsonl`))
        .find(existsSync)
    : undefined
  const found = {}
  if (transcript)
    findFromEnd(transcript, event => {
      if (event.type !== 'assistant' || event.isSidechain) return undefined
      found.model ??= event.message?.model
      found.effort ??= event.effort
      return found.model && found.effort ? found : undefined
    })
  return found
}

/** Reads the model of the latest assistant message in an OpenCode session, and the effort variant the latest user message asked for or else the session's. */
const opencodeModelAndEffort = sessionId => {
  const path =
    process.env.OPENCODE_DB ||
    join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'opencode', 'opencode.db')
  if (!existsSync(path)) return {}
  try {
    // Loaded here rather than imported so that only OpenCode commits pay for SQLite.
    const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')
    const db = new DatabaseSync(path, { readOnly: true })
    /** Reads a field from the latest message with the requested role. */
    const latest = (role, field) =>
      db
        .prepare(
          `SELECT json_extract(data, '$.${field}') AS value FROM message
           WHERE session_id = ? AND json_extract(data, '$.role') = ? ORDER BY time_created DESC LIMIT 1`,
        )
        .get(sessionId, role)?.value
    // A message records a variant only when one was chosen; otherwise the session's own, often "default", applies.
    const sessionVariant = db
      .prepare(`SELECT json_extract(model, '$.variant') AS value FROM session WHERE id = ?`)
      .get(sessionId)?.value
    const result = {
      model: latest('assistant', 'modelID'),
      effort: latest('user', 'model.variant') || sessionVariant,
    }
    db.close()
    return result
  } catch {
    return {}
  }
}

/** Returns a named Cursor model, excluding its routing placeholders such as Auto and default. */
const concreteCursorModel = value =>
  typeof value === 'string' && !/^(default|unknown|auto|cursor-auto)/i.test(value) ? value : undefined

/** Reads the model and effort that .cursor/hooks/save-prompt-model.mjs saved for this Cursor conversation's current prompt. */
const cursorModelAndEffort = conversationId => {
  try {
    const cache = execFileSync('git', ['rev-parse', '--git-path', 'cursor-attribution-cache'], {
      encoding: 'utf8',
    }).trim()
    const record = JSON.parse(
      readFileSync(join(cache, `${createHash('sha256').update(conversationId).digest('hex')}.json`), 'utf8'),
    )
    // CURSOR_REQUEST_ID is the prompt's generation ID, so a record left by an earlier prompt is not mistaken for this one.
    if (process.env.CURSOR_REQUEST_ID && record.generation_id !== process.env.CURSOR_REQUEST_ID) return {}
    const model = concreteCursorModel(record.model_id) || concreteCursorModel(record.model)
    return {
      model,
      // An effort without a named model would describe whatever Auto routed to, so it is dropped with the model.
      effort: model && record.model_params?.find(({ id }) => id === 'effort' || id === 'reasoning_effort')?.value,
    }
  } catch {
    return {}
  }
}

/** Each harness's identity, the variable its shell sets, and how to read its session record. Add one entry per harness, and its variable to commit-msg. */
const HARNESSES = [
  { agent: 'Codex', email: 'noreply@openai.com', sessionVar: 'CODEX_SESSION_ID', readSession: codexModelAndEffort },
  {
    agent: 'Claude',
    email: 'noreply@anthropic.com',
    sessionVar: 'CLAUDE_CODE_SESSION_ID',
    readSession: claudeModelAndEffort,
  },
  // Pi exports the model and reasoning level to each command its agent runs.
  {
    agent: 'Pi',
    email: 'noreply@pi.dev',
    sessionVar: 'PI_SESSION_ID',
    readSession: () => ({ model: process.env.PI_MODEL, effort: process.env.PI_REASONING_LEVEL }),
  },
  // OpenCode sets no session variable of its own; .opencode/plugins/session-env.js exports this one.
  {
    agent: 'OpenCode',
    email: 'noreply@opencode.ai',
    sessionVar: 'OPENCODE_SESSION_ID',
    readSession: opencodeModelAndEffort,
  },
  // Cursor's shell carries the conversation and generation IDs, but its model only reaches Cursor's own hooks.
  {
    agent: 'Cursor',
    email: 'cursoragent@cursor.com',
    sessionVar: 'CURSOR_CONVERSATION_ID',
    readSession: cursorModelAndEffort,
  },
]

/** Returns true while Git is replaying a prior commit, whose existing authorship must be preserved. */
const replayingCommit = () =>
  execFileSync(
    'git',
    ['rev-parse', ...['CHERRY_PICK_HEAD', 'REBASE_HEAD', 'REVERT_HEAD', 'MERGE_HEAD'].flatMap(m => ['--git-path', m])],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .some(existsSync)

/** Normalizes the agent co-author trailer in Git's proposed message. */
const main = () => {
  const harness = HARNESSES.find(({ sessionVar }) => process.env[sessionVar])
  if (!harness || replayingCommit()) return

  const messagePath = process.argv[2]
  const { model, effort } = harness.readSession(process.env[harness.sessionVar])
  const expected = `Co-Authored-By: ${harness.agent} ${model || 'unknown'} (${effort || 'unknown'}) <${harness.email}>`
  const pattern = new RegExp(`^Co-Authored-By:\\s*${harness.agent}\\b`, 'i')
  const lines = readFileSync(messagePath, 'utf8').split('\n')
  const existing = lines.filter(line => pattern.test(line))
  if (existing.length === 1 && existing[0] === expected) return

  const body = lines.filter(line => !pattern.test(line))
  const lastLine = body.findLastIndex(line => line.trim())
  const kept = body.slice(0, lastLine + 1)
  // Join an existing trailer block only when it is a paragraph after the subject. A subject such as
  // "fix: …" looks like a trailer, and the trailer must not be glued onto it.
  const lastBlank = kept.findLastIndex(line => !line.trim())
  const endsInTrailers = lastBlank > 0 && kept.slice(lastBlank + 1).every(line => ANY_TRAILER.test(line))
  const separator = endsInTrailers ? '\n' : '\n\n'
  writeFileSync(messagePath, kept.join('\n') + separator + expected + '\n')
}

main()
