import storage from './storage'

/** The localStorage key under which the rolling debug log is persisted. */
const DEBUG_LOG_KEY = 'debugLog'

/** Maximum number of entries retained in the rolling buffer. Older entries are dropped first. */
const DEBUG_LOG_CAPACITY = 500

/** Maximum length of any single stringified field. Longer values are truncated to protect the ~5MB localStorage quota. */
const FIELD_MAX_LENGTH = 2000

/** Minimum interval between `frame` heartbeat entries so requestAnimationFrame does not flood the buffer. */
const FRAME_HEARTBEAT_THROTTLE_MS = 500

/** A single rolling-log entry. `seq`, `t`, `dt`, and `type` form a common envelope; all other fields are event-specific. */
interface DebugLogEntry {
  /** Monotonic sequence number. Gaps or a rapidly climbing counter reveal dropped entries or a runaway loop. */
  seq: number
  /** Wall-clock timestamp (Date.now()), so entries remain readable after a device restart. */
  t: number
  /** Milliseconds since the previous entry (high-resolution). A cadence collapsing toward 0 indicates a tight loop. */
  dt: number
  /** Short event tag, e.g. 'input', 'action', 'guard', 'frame'. */
  type: string
  [key: string]: unknown
}

/** Loads any previously persisted entries from localStorage so a prior session's log survives a reload or device restart for retrieval. Never throws. */
const hydrate = (): DebugLogEntry[] => {
  try {
    const raw = storage.getItem(DEBUG_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DebugLogEntry[]) : []
  } catch {
    return []
  }
}

// in-memory source of truth; avoids parsing localStorage on every log() call
let entries: DebugLogEntry[] = hydrate()
// whether logging is currently active; when false, log() is a no-op with zero cost
let enabled = false
// monotonic sequence counter
let seq = entries.length > 0 ? entries[entries.length - 1].seq + 1 : 0
// performance.now() of the previous entry, used to compute dt
let lastTime = 0
// requestAnimationFrame handle for the frame heartbeat
let frameId: number | null = null
// performance.now() of the last emitted frame heartbeat, used to throttle it
let lastFrameLogged = 0

/** Truncates over-long string fields so a single pathological value cannot exhaust the localStorage quota. */
const capFields = (fields?: Record<string, unknown>): Record<string, unknown> => {
  if (!fields) return {}
  const capped: Record<string, unknown> = {}
  Object.keys(fields).forEach(key => {
    const value = fields[key]
    capped[key] =
      typeof value === 'string' && value.length > FIELD_MAX_LENGTH
        ? `${value.slice(0, FIELD_MAX_LENGTH)}…(+${value.length - FIELD_MAX_LENGTH})`
        : value
  })
  return capped
}

/** Persists the in-memory buffer to localStorage synchronously. On quota errors, drops the oldest half and retries once, then gives up silently. Never throws. */
const persist = (): void => {
  try {
    storage.setItem(DEBUG_LOG_KEY, JSON.stringify(entries))
  } catch {
    // Most likely a quota error. Drop the oldest half and retry once so the most recent (most relevant) entries survive.
    entries.splice(0, Math.ceil(entries.length / 2))
    try {
      storage.setItem(DEBUG_LOG_KEY, JSON.stringify(entries))
    } catch {
      // Give up silently; logging must never interfere with the app.
    }
  }
}

/** Appends an entry to the rolling buffer and persists it synchronously. No-op when logging is disabled. Never throws, so instrumentation can never worsen a freeze or break editing. */
const log = (type: string, fields?: Record<string, unknown>): void => {
  if (!enabled) return
  try {
    const now = performance.now()
    const dt = lastTime === 0 ? 0 : Math.round(now - lastTime)
    lastTime = now
    entries.push({ seq: seq++, t: Date.now(), dt, type, ...capFields(fields) })
    if (entries.length > DEBUG_LOG_CAPACITY) {
      entries.splice(0, entries.length - DEBUG_LOG_CAPACITY)
    }
    persist()
  } catch {
    // Logging must never throw.
  }
}

/** The frame heartbeat loop. Records a throttled `frame` entry on each animation frame while logging is enabled. If the log stops but the last `frame` timestamp is stale, the freeze was a synchronous JS loop (rAF never fired again); if `frame` keeps ticking past the last event, the hang is at the native/WebKit layer. */
const frameLoop = (): void => {
  if (!enabled) return
  const now = performance.now()
  if (now - lastFrameLogged >= FRAME_HEARTBEAT_THROTTLE_MS) {
    lastFrameLogged = now
    log('frame')
  }
  frameId = requestAnimationFrame(frameLoop)
}

/** Starts the requestAnimationFrame heartbeat. No-op if unavailable (e.g. SSR). */
const startFrameHeartbeat = (): void => {
  if (typeof requestAnimationFrame !== 'function' || frameId != null) return
  lastFrameLogged = 0
  frameId = requestAnimationFrame(frameLoop)
}

/** Stops the requestAnimationFrame heartbeat. */
const stopFrameHeartbeat = (): void => {
  if (frameId != null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frameId)
  }
  frameId = null
}

/** Returns a copy of the current buffer, including any entries hydrated from a prior session. */
const read = (): DebugLogEntry[] => [...entries]

/** Renders the buffer to a copy-friendly, one-line-per-entry text block for pasting into an issue. */
const format = (): string =>
  entries
    .map(({ seq, t, dt, type, ...fields }) => {
      const fieldStr = Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : ''
      return `[${new Date(t).toISOString()}] +${dt}ms #${seq} ${type}${fieldStr}`
    })
    .join('\n')

/** Empties the buffer and removes it from localStorage. */
const clear = (): void => {
  entries = []
  seq = 0
  lastTime = 0
  try {
    storage.removeItem(DEBUG_LOG_KEY)
  } catch {
    // ignore
  }
}

/** Returns whether logging is currently active. */
const isEnabled = (): boolean => enabled

/** Enables or disables logging. Enabling records a session marker (environment metadata) and starts the frame heartbeat; disabling stops the heartbeat. Idempotent. */
const setEnabled = (value: boolean): void => {
  if (value === enabled) return
  enabled = value
  if (enabled) {
    log('session', {
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screen: typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : '',
      mode: import.meta.env.MODE,
    })
    startFrameHeartbeat()
  } else {
    stopFrameHeartbeat()
  }
}

/** A synchronous, bounded, persistent rolling debug log for diagnosing catastrophic bugs (e.g. freezes) that survive a device restart, where console logging is unavailable. See src/util/debugLog.ts. */
const debugLog = {
  clear,
  format,
  isEnabled,
  log,
  read,
  setEnabled,
}

export default debugLog
