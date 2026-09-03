import { Capacitor } from '@capacitor/core'
import pkg from '../../package.json'
import State from '../@types/State'
import storage from './storage'

/** The localStorage key prefix under which the rolling debug log is persisted. Entries are sharded across numbered chunk keys (`debugLog-0` … `debugLog-9`) so that appending an entry only rewrites the active chunk instead of the whole buffer. */
const DEBUG_LOG_KEY = 'debugLog'

/** Number of entries per persisted chunk. */
const CHUNK_SIZE = 500

/** Number of rotating chunk keys. Capacity = CHUNK_SIZE * CHUNK_COUNT. */
const CHUNK_COUNT = 10

/** Maximum number of entries retained in the rolling buffer. Older entries are dropped first. */
const DEBUG_LOG_CAPACITY = CHUNK_SIZE * CHUNK_COUNT

/** Maximum length of any single stringified field. Longer values are truncated to protect the ~5MB localStorage quota. */
const FIELD_MAX_LENGTH = 2000

/** The localStorage key holding the timestamp of the most recent animation frame. Updated in place (never appended to the buffer) so a healthy requestAnimationFrame loop leaves a heartbeat without evicting real events. */
const FRAME_MARKER_KEY = 'debugLog-frame'

/** Minimum interval between writes of the frame marker, so the rAF loop does not hammer localStorage. */
const FRAME_MARKER_THROTTLE_MS = 500

/** Minimum gap between consecutive animation frames before a `frameGap` entry is appended. A healthy cadence carries no information per entry — only an anomalous gap (jank, GC pause, tab suspension) is worth an entry. */
const FRAME_GAP_THRESHOLD_MS = 500

/** Maximum characters of a thought value rendered in the format() state dump. */
const DUMP_VALUE_MAX_LENGTH = 100

/** The localStorage key recording a device-local opt-out of auto-enabled logging (see autoEnabled), so a development or preview host can be aligned with production (e.g. for performance testing). A preference rather than log data, so clear() leaves it alone. */
const OPT_OUT_KEY = 'debugLogOptOut'

/** A single rolling-log entry. `seq`, `t`, `dt`, and `type` form a common envelope; all other fields are event-specific. */
interface DebugLogEntry {
  /** Monotonic sequence number. Gaps or a rapidly climbing counter reveal dropped entries or a runaway loop. */
  seq: number
  /** Wall-clock timestamp (Date.now()), so entries remain readable after a device restart. */
  t: number
  /** Milliseconds since the previous entry (high-resolution). A cadence collapsing toward 0 indicates a tight loop. */
  dt: number
  /** Short event tag, e.g. 'input', 'action', 'move', 'frameGap'. */
  type: string
  [key: string]: unknown
}

/** Returns the localStorage key of the numbered chunk. */
const chunkKey = (i: number): string => `${DEBUG_LOG_KEY}-${i}`

/** Returns the chunk ordinal (0 … CHUNK_COUNT-1) that an entry with the given seq belongs to. */
const chunkOrdinal = (seq: number): number => Math.floor(seq / CHUNK_SIZE) % CHUNK_COUNT

/** Parses one persisted chunk (or the legacy single-key buffer) into an entry array. Never throws. */
const parseEntries = (raw: string | null): DebugLogEntry[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DebugLogEntry[]) : []
  } catch {
    return []
  }
}

/** Loads any previously persisted entries from localStorage so a prior session's log survives a reload or device restart for retrieval. Reads the rotating chunk keys plus the legacy single-key buffer (pre-chunking versions), oldest first, trimmed to capacity. Never throws. */
const hydrate = (): DebugLogEntry[] => {
  try {
    const chunked = Array.from({ length: CHUNK_COUNT }, (_, i) => parseEntries(storage.getItem(chunkKey(i))))
      .flat()
      .sort((a, b) => a.seq - b.seq)
    // The legacy key precedes chunked persistence, so its entries are older than any chunk's. The tail of the legacy
    // buffer is re-persisted into a chunk once new entries arrive (see the chunk priming below), so drop any legacy
    // entry whose seq already appears in a chunk to avoid double-hydrating it.
    const chunkedSeqs = new Set(chunked.map(entry => entry.seq))
    const legacy = parseEntries(storage.getItem(DEBUG_LOG_KEY)).filter(entry => !chunkedSeqs.has(entry.seq))
    return [...legacy, ...chunked].slice(-DEBUG_LOG_CAPACITY)
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
// the entries of the chunk currently being written, so persist() only serializes CHUNK_SIZE entries.
// primed with the tail of the hydrated buffer so a resumed session does not clobber the partially-filled chunk on disk.
let chunk: DebugLogEntry[] = entries.filter(
  entry => Math.floor(entry.seq / CHUNK_SIZE) === Math.floor((seq - 1) / CHUNK_SIZE),
)
// performance.now() of the previous entry, used to compute dt
let lastTime = 0
// requestAnimationFrame handle for the frame heartbeat
let frameId: number | null = null
// performance.now() of the previous rAF callback, used to measure the inter-frame gap
let lastFrameTime = 0
// performance.now() of the last frame marker write, used to throttle it
let lastMarkerWritten = 0

/** True when the app is served from a development or preview host, where logging defaults to on (disableable per device — see setAutoOptOut): localhost (or another loopback address, matching serviceWorkerRegistration.ts) and Vercel preview deployments (*.vercel.app). Excludes the test environments that also run on localhost — Vitest via MODE, Puppeteer via navigator.webdriver — so tests keep explicit setEnabled semantics and production timing, and excludes the native Capacitor and Tauri shells, which serve production builds from localhost-like origins (capacitor://localhost, https://localhost, tauri://localhost). */
const autoEnabled =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  import.meta.env.MODE !== 'test' &&
  !navigator.webdriver &&
  !Capacitor.isNativePlatform() &&
  /^https?:$/.test(window.location.protocol) &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(window.location.hostname) ||
    window.location.hostname.endsWith('.vercel.app'))

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

/** Persists the active chunk to localStorage synchronously. On quota errors, removes every other chunk (keeping the newest entries) and retries once, then gives up silently. Never throws. */
const persist = (): void => {
  const key = chunkKey(chunkOrdinal(chunk[chunk.length - 1]?.seq ?? 0))
  try {
    storage.setItem(key, JSON.stringify(chunk))
  } catch {
    // Most likely a quota error. Free the other chunks so the most recent (most relevant) entries survive.
    try {
      Array.from({ length: CHUNK_COUNT }, (_, i) => chunkKey(i))
        .filter(k => k !== key)
        .forEach(k => storage.removeItem(k))
      storage.removeItem(DEBUG_LOG_KEY)
      storage.setItem(key, JSON.stringify(chunk))
    } catch {
      // Give up silently; logging must never interfere with the app.
    }
  }
}

/** Appends an entry to the rolling buffer and persists its chunk synchronously. No-op when logging is disabled. Never throws, so instrumentation can never worsen a freeze or break editing. */
const log = (type: string, fields?: Record<string, unknown>): void => {
  if (!enabled) return
  try {
    const now = performance.now()
    const dt = lastTime === 0 ? 0 : Math.round(now - lastTime)
    lastTime = now
    const entry: DebugLogEntry = { seq: seq++, t: Date.now(), dt, type, ...capFields(fields) }
    entries.push(entry)
    if (entries.length > DEBUG_LOG_CAPACITY) {
      entries.splice(0, entries.length - DEBUG_LOG_CAPACITY)
    }
    // start a fresh chunk at each chunk boundary; its key rotates onto (and thereby evicts) the oldest persisted chunk
    if (chunk.length > 0 && chunkOrdinal(entry.seq) !== chunkOrdinal(chunk[chunk.length - 1].seq)) {
      chunk = []
    }
    chunk.push(entry)
    persist()
  } catch {
    // Logging must never throw.
  }
}

/** The frame heartbeat loop. While logging is enabled, writes a small in-place marker (FRAME_MARKER_KEY) at most every 500ms, and appends a `frameGap` entry only when the gap between consecutive animation frames is anomalous. If the log stops and the marker is stale, the freeze was a synchronous JS loop (rAF never fired again); if the marker keeps advancing past the last event, the hang is at the native/WebKit layer. Healthy frames no longer append entries, so idle time cannot evict real events from the buffer. */
const frameLoop = (): void => {
  if (!enabled) return
  const now = performance.now()
  if (lastFrameTime !== 0 && now - lastFrameTime >= FRAME_GAP_THRESHOLD_MS) {
    log('frameGap', { gap: Math.round(now - lastFrameTime) })
  }
  lastFrameTime = now
  if (now - lastMarkerWritten >= FRAME_MARKER_THROTTLE_MS) {
    lastMarkerWritten = now
    try {
      storage.setItem(FRAME_MARKER_KEY, String(Date.now()))
    } catch {
      // Marker writes must never interfere with the app.
    }
  }
  frameId = requestAnimationFrame(frameLoop)
}

/** Starts the requestAnimationFrame heartbeat. No-op if unavailable (e.g. SSR). */
const startFrameHeartbeat = (): void => {
  if (typeof requestAnimationFrame !== 'function' || frameId != null) return
  lastFrameTime = 0
  lastMarkerWritten = 0
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

/** Renders one thought of the format() state dump as a single line. */
const formatThought = (thought: {
  id: string
  value: string
  rank: number
  parentId: string
  pending?: boolean
}): string => {
  const value =
    thought.value.length > DUMP_VALUE_MAX_LENGTH ? `${thought.value.slice(0, DUMP_VALUE_MAX_LENGTH)}…` : thought.value
  return `${thought.id} ${JSON.stringify(value)} rank:${thought.rank} parent:${thought.parentId}${thought.pending ? ' pending' : ''}`
}

/** Renders the buffer to a copy-friendly, one-line-per-entry text block for pasting into an issue. Appends the last-frame marker and, when state is provided, a compact dump of state.thoughts.thoughtIndex (one line per thought, grouped by parent and ordered by rank) so entry ids can be resolved to values and current sibling order is visible. */
const format = (state?: State): string => {
  const entryLines = entries
    .map(({ seq, t, dt, type, ...fields }) => {
      const fieldStr = Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : ''
      return `[${new Date(t).toISOString()}] +${dt}ms #${seq} ${type}${fieldStr}`
    })
    .join('\n')

  let markerLine = ''
  try {
    const marker = storage.getItem(FRAME_MARKER_KEY)
    markerLine = marker ? `\n--- lastFrameAt: ${new Date(Number(marker)).toISOString()}` : ''
  } catch {
    // ignore
  }

  const dump = state
    ? [
        `\n--- state.thoughts: ${Object.keys(state.thoughts.thoughtIndex).length} thoughts, ${Object.keys(state.thoughts.lexemeIndex).length} lexemes`,
        ...Object.values(state.thoughts.thoughtIndex)
          .sort((a, b) => (a.parentId < b.parentId ? -1 : a.parentId > b.parentId ? 1 : a.rank - b.rank))
          .map(formatThought),
      ].join('\n')
    : ''

  return `${entryLines}${markerLine}${dump}`
}

/** Empties the buffer and removes all of its localStorage keys, including the legacy single-key buffer and the frame marker. */
const clear = (): void => {
  entries = []
  chunk = []
  seq = 0
  lastTime = 0
  try {
    storage.removeItem(DEBUG_LOG_KEY)
    storage.removeItem(FRAME_MARKER_KEY)
    Array.from({ length: CHUNK_COUNT }, (_, i) => storage.removeItem(chunkKey(i)))
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
      appVersion: pkg.version,
      commitHash: __COMMIT_HASH__,
    })
    startFrameHeartbeat()
  } else {
    stopFrameHeartbeat()
  }
}

/** Returns whether this device has opted out of auto-enabled logging. Only consulted on auto-enable hosts. Never throws. */
const isAutoOptOut = (): boolean => {
  try {
    return storage.getItem(OPT_OUT_KEY) === 'true'
  } catch {
    return false
  }
}

/** Records or clears the device-local opt-out of auto-enabled logging and applies it immediately. No-op off auto-enable hosts, so the opt-out cannot suppress the synced Debug Logging setting in production. Never throws. */
const setAutoOptOut = (optOut: boolean): void => {
  if (!autoEnabled) return
  try {
    if (optOut) {
      storage.setItem(OPT_OUT_KEY, 'true')
    } else {
      storage.removeItem(OPT_OUT_KEY)
    }
  } catch {
    // The opt-out must never interfere with the app.
  }
  setEnabled(!optOut)
}

// Start logging immediately on development and preview hosts (unless this device opted out) so initialization is captured, rather than waiting for the settings mirror in AppComponent to mount.
if (autoEnabled && !isAutoOptOut()) setEnabled(true)

/** A synchronous, bounded, persistent rolling debug log for diagnosing catastrophic bugs (e.g. freezes) that survive a device restart, where console logging is unavailable. See src/util/debugLog.ts. */
const debugLog = {
  autoEnabled,
  clear,
  format,
  isAutoOptOut,
  isEnabled,
  log,
  read,
  setAutoOptOut,
  setEnabled,
}

export default debugLog
