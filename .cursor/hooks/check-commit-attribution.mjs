// Require the active Cursor model in agent-authored commit commands.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const promptEvent = process.argv[2] === 'prompt'

/** Returns a Cursor permission-hook response. */
const decision = (permission, message) =>
  message ? { permission, agent_message: message, user_message: message } : { permission }

/** Resolves a file inside this worktree's Git metadata directory. */
const gitMetadataPath = name =>
  execFileSync('git', ['rev-parse', '--git-path', name], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()

/** Names a per-conversation cache file when Cursor supplies both IDs. */
const promptCachePath = payload =>
  payload.conversation_id && payload.generation_id
    ? join(
        gitMetadataPath('cursor-attribution-cache'),
        `${createHash('sha256').update(payload.conversation_id).digest('hex')}.json`,
      )
    : null

/** Keeps the current generation's model fields outside the worktree. */
const savePromptModel = payload => {
  try {
    const path = promptCachePath(payload)
    if (!path) return
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(
      path,
      JSON.stringify({
        generation_id: payload.generation_id,
        model: payload.model,
        model_id: payload.model_id,
        model_params: payload.model_params,
      }),
    )
  } catch {
    // Attribution caching must not interrupt a prompt.
  }
}

/** Reads model fields only from the matching conversation and generation. */
const loadPromptModel = payload => {
  try {
    const path = promptCachePath(payload)
    if (!path || !existsSync(path)) return null
    const record = JSON.parse(readFileSync(path, 'utf8'))
    return record.generation_id === payload.generation_id ? record : null
  } catch {
    return null
  }
}

/** Returns a named model, excluding Cursor's routing placeholders. */
const concreteModel = value => {
  if (typeof value !== 'string') return null
  const normalized = value.toLowerCase()
  return ['default', 'unknown'].includes(normalized) || /^(auto|cursor-auto)/.test(normalized) ? null : value
}

/** Records selected hook fields when local diagnostics are enabled. */
const recordModelFields = (payload, cacheHit = null) => {
  try {
    const diagnosticPath = gitMetadataPath('cursor-attribution-debug')
    if (!existsSync(`${diagnosticPath}.enabled`)) return
    const record = {
      event: promptEvent ? 'prompt' : 'commit',
      model: payload.model,
      model_id: payload.model_id,
      model_params: payload.model_params,
      cursor_version: payload.cursor_version,
      conversation_id_present: !!payload.conversation_id,
      generation_id_present: !!payload.generation_id,
      cache_hit: cacheHit,
    }
    appendFileSync(`${diagnosticPath}.jsonl`, JSON.stringify(record) + '\n')
  } catch {
    // Diagnostics must not interrupt a prompt or a commit.
  }
}

/** Checks a Cursor shell hook payload for a complete commit trailer. */
const main = () => {
  const payload = JSON.parse(readFileSync(0, 'utf8'))

  if (promptEvent) {
    savePromptModel(payload)
    recordModelFields(payload)
    return { continue: true }
  }

  const command = payload.command || ''

  // The project hook only governs commits run by Cursor's agent shell.
  if (!/(?:^|[;&|]\s*)git\s+commit\b/.test(command)) return decision('allow')

  const cached = loadPromptModel(payload)
  recordModelFields(payload, cached !== null)
  const currentModel = concreteModel(payload.model_id) || concreteModel(payload.model)
  const cachedModel = concreteModel(cached?.model_id) || concreteModel(cached?.model)
  const model = currentModel || cachedModel || 'unknown'
  const parameters = [...(payload.model_params || []), ...(model === cachedModel ? cached?.model_params || [] : [])]
  const effort = parameters.find(parameter => ['effort', 'reasoning_effort'].includes(parameter.id))?.value

  const label = effort && model !== 'unknown' ? `${model} (${effort})` : model
  const trailer = `Co-Authored-By: Cursor ${label} <cursoragent@cursor.com>`
  const cursorTrailers = command.match(/Co-Authored-By:\s*Cursor[^\n"']*<cursoragent@cursor\.com>/gi) || []

  return cursorTrailers.length === 1 && cursorTrailers[0].toLowerCase() === trailer.toLowerCase()
    ? decision('allow')
    : decision(
        'deny',
        `Include exactly this trailer in the git commit message: ${trailer}. ` +
          'Remove any other Cursor Co-Authored-By trailer. Cursor may append its own trailer after this hook; ' +
          'inspect the resulting commit and report any duplicate.',
      )
}

process.stdout.write(JSON.stringify(main()))
