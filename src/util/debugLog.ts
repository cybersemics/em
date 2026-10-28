import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { isTauri } from '@tauri-apps/api/core'
import pkg from '../../package.json'
import State from '../@types/State'
import { isTouch } from '../browser'
import getSafeAreaBottom from '../device/virtual-keyboard/getSafeAreaBottom'
import { registerReset } from '../stores/ministore'
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

/** The localStorage key holding the touch traces of the most recent gestures. Rewritten in place (never appended to the buffer), so the dozens of points a single swipe produces cannot evict real events. */
const GESTURE_TRACES_KEY = 'debugLog-gestures'

/** Number of gesture traces retained. Older traces are dropped first. */
const GESTURE_TRACE_COUNT = 5

/** Maximum number of points kept per gesture trace, so a finger held down for a long time cannot exhaust the localStorage quota. */
const GESTURE_TRACE_MAX_POINTS = 500

/** Minimum interval between writes of the frame marker, so the rAF loop does not hammer localStorage. */
const FRAME_MARKER_THROTTLE_MS = 500

/** Minimum gap between consecutive animation frames before a `frameGap` entry is appended. A healthy cadence carries no information per entry — only an anomalous gap (jank, GC pause, tab suspension) is worth an entry. */
const FRAME_GAP_THRESHOLD_MS = 500

/** Maximum characters of a thought value rendered in the format() state dump. */
const DUMP_VALUE_MAX_LENGTH = 100

/** The localStorage key recording a device-local opt-out of auto-enabled logging (see autoEnabled), so a development or preview host can be aligned with production (e.g. for performance testing). A preference rather than log data, so clear() leaves it alone. */
const OPT_OUT_KEY = 'debugLogOptOut'

/** The localStorage key recording a device-local opt-in to mirroring every entry to the console as it is appended (see setConsole). A preference rather than log data, so clear() leaves it alone. */
const CONSOLE_KEY = 'debugLogConsole'

/** Prefix on every mirrored console line, so debug log entries can be told apart from the app's other console output (`console.info` from testFlags.logActions, React warnings, network errors) when reading a console listing. */
const CONSOLE_PREFIX = 'debugLog'

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

/** The touch path of one gesture, from the finger landing to the finger lifting. */
interface GestureTrace {
  /** Wall-clock timestamp (Date.now()) of the touchstart, which matches the time of its touchstart entry. */
  t: number
  /** The swipe sequence recognized when the finger lifted. */
  sequence: string
  /** Whether the gesture was abandoned, and so executed nothing. */
  abandon: boolean
  /** Viewport points as [milliseconds since touchstart, x, y], starting with the touchstart itself. */
  points: [number, number, number][]
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
// the touch traces of the most recent gestures, oldest first
let gestureTraces: GestureTrace[] = (() => {
  try {
    const parsed = JSON.parse(storage.getItem(GESTURE_TRACES_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as GestureTrace[]).slice(-GESTURE_TRACE_COUNT) : []
  } catch {
    return []
  }
})()
// whether logging is currently active; when false, log() is a no-op with zero cost
let enabled = false
// whether each entry is also mirrored to the console as it is appended. Read once here rather than per
// entry, so the mirror costs one boolean test in log() while it is off.
let consoleEnabled = (() => {
  try {
    return storage.getItem(CONSOLE_KEY) === 'true'
  } catch {
    return false
  }
})()
// monotonic sequence counter
let seq = entries.length > 0 ? entries[entries.length - 1].seq + 1 : 0
// the entries of the chunk currently being written, so persist() only serializes CHUNK_SIZE entries.
// primed with the tail of the hydrated buffer so a resumed session does not clobber the partially-filled chunk on disk.
let chunk: DebugLogEntry[] = entries.filter(
  entry => Math.floor(entry.seq / CHUNK_SIZE) === Math.floor((seq - 1) / CHUNK_SIZE),
)
// performance.now() of the previous entry, used to compute dt
let lastTime = 0
// UTC date of the last entry mirrored to the console, so the mirror writes a `--- date` line only when it changes
let lastMirroredDate = ''
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

/** Number of leading characters a thought id is cut to in format()'s output. At 10 hex characters, two of the ~2000 distinct ids a full buffer carries share a prefix with a probability of about one in a million. */
const SHORT_ID_LENGTH = 10

/** Matches a full thought id: 32 lowercase hex characters (see src/util/createId.ts). */
const ID_REGEX = /\b[0-9a-f]{32}\b/g

/** Matches a reserved thought id — HOME_TOKEN, EM_TOKEN and the rest (src/constants.ts), all of which carry at least 24 leading zeros. These are kept whole: they are short in tokens and mean the same thing on every device. */
const RESERVED_ID_REGEX = /^0{24}/

/** Shortens every non-reserved thought id in the text to its first SHORT_ID_LENGTH characters. */
const shortenIds = (text: string): string =>
  text.replace(ID_REGEX, id => (RESERVED_ID_REGEX.test(id) ? id : id.slice(0, SHORT_ID_LENGTH)))

/** Drops the fields that carry nothing an agent needs, recursively: `isComposing: false`, the default; `value` when it only repeats a reserved id; and the `label` and `source` of commandMetadata, which repeat its commandId. */
const prune = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(prune)
  if (!value || typeof value !== 'object') return value
  const obj = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(obj)
      .filter(
        ([key, child]) =>
          !(key === 'isComposing' && child === false) &&
          !(key === 'value' && child === obj.id && typeof child === 'string' && RESERVED_ID_REGEX.test(child)),
      )
      .map(([key, child]) => {
        if (key !== 'commandMetadata' || !child || typeof child !== 'object') return [key, prune(child)]
        const { label: _label, source: _source, ...rest } = child as Record<string, unknown>
        return [key, prune(rest)]
      }),
  )
}

/**
 * Compacts the fields of one entry. An `action` entry's actionType is returned as a label for the envelope, and its
 * payload — stringified when it was logged, so that the field cap bounds it in storage — is parsed back and spread
 * into the fields, which removes a level of escaping from every key. A payload that does not parse (one cut by the
 * field cap) or is not an object stays a `payload` string.
 */
const compactFields = (type: string, fields: Record<string, unknown>): { label: string | null; fields: object } => {
  if (type !== 'action' || typeof fields.actionType !== 'string')
    return { label: null, fields: prune(fields) as object }
  const { actionType, payload, ...rest } = fields
  const parsed = ((): unknown => {
    if (typeof payload !== 'string') return undefined
    try {
      return JSON.parse(payload)
    } catch {
      return undefined
    }
  })()
  const spread =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : payload !== undefined
        ? { payload }
        : {}
  return { label: actionType, fields: prune({ ...rest, ...spread }) as object }
}

/** Returns the UTC date of a timestamp as YYYY-MM-DD, which format() and the console mirror write as a `--- date` line whenever it changes, so that each entry carries only the time of day. */
const utcDate = (t: number): string => new Date(t).toISOString().slice(0, 10)

/**
 * Renders one entry as a single line: the UTC time of day, `dt`, `seq` and `type` envelope — followed, for an `action`,
 * by its actionType — and then the event-specific fields as JSON, compacted (see compactFields) and with thought ids
 * shortened. Shared by format() and the console mirror so that a log read off the console parses identically to
 * one dumped from the buffer. The log is read only by agents, so the line is shaped for tokens rather than for a person.
 */
const formatEntry = ({ seq, t, dt, type, ...fields }: DebugLogEntry): string => {
  const compacted = compactFields(type, fields)
  const fieldStr = Object.keys(compacted.fields).length > 0 ? ` ${JSON.stringify(compacted.fields)}` : ''
  const line = `${new Date(t).toISOString().slice(11, 23)} +${dt}ms #${seq} ${type}${compacted.label ? ` ${compacted.label}` : ''}${fieldStr}`
  return shortenIds(line)
}

/**
 * Appends an entry to the rolling buffer and persists its chunk synchronously. No-op when logging is disabled. Never
 * throws, so instrumentation can never worsen a freeze or break editing.
 *
 * Fields whose values are static (variables, property reads, literals) are passed as an object. Fields that call a
 * function or read layout are passed as a function returning the object instead, so that nothing is computed for them
 * while logging is off, which it is in production unless the user turns it on. The function is called synchronously,
 * so it reads the same values an object would have captured, and inside the try, so a field that throws costs only its
 * entry. The em/no-precomputed-debug-log-fields lint rule enforces the split.
 */
const log = (type: string, fields?: Record<string, unknown> | (() => Record<string, unknown>)): void => {
  if (!enabled) return
  try {
    // computed before anything else, so a field that throws leaves seq and dt as if the entry had never been attempted
    const capped = capFields(typeof fields === 'function' ? fields() : fields)
    const now = performance.now()
    const dt = lastTime === 0 ? 0 : Math.round(now - lastTime)
    lastTime = now
    const entry: DebugLogEntry = { seq: seq++, t: Date.now(), dt, type, ...capped }
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
    // Mirror to the console last, so a console that throws or is monkey-patched cannot cost the entry its
    // place in the persisted buffer — which is the copy that survives a freeze or a device restart.
    if (consoleEnabled) {
      const date = utcDate(entry.t)
      if (date !== lastMirroredDate) {
        lastMirroredDate = date
        console.info(`${CONSOLE_PREFIX} --- date: ${date}`)
      }
      console.info(`${CONSOLE_PREFIX} ${formatEntry(entry)}`)
    }
  } catch {
    // Logging must never throw.
  }
}

/** The frame heartbeat loop. While logging is enabled, writes a small in-place marker (FRAME_MARKER_KEY) at most every 500ms, and appends a `frameGap` entry only when the gap between consecutive animation frames is anomalous. If the log stops and the marker is stale, the freeze was a synchronous JS loop (rAF never fired again); if the marker keeps advancing past the last event, the hang is at the native/WebKit layer. Healthy frames no longer append entries, so idle time cannot evict real events from the buffer. */
const frameLoop = (): void => {
  if (!enabled) return
  const now = performance.now()
  if (lastFrameTime !== 0 && now - lastFrameTime >= FRAME_GAP_THRESHOLD_MS) {
    log('frameGap', () => ({ gap: Math.round(now - lastFrameTime) }))
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

/** The hardware model of the device the native app runs on, e.g. `iPhone15,4` (iPhone 15) or `Pixel 8`. A browser exposes only the device family through navigator.platform, so this stays null on the web, and in a native app built before the Device plugin was added. Read once at load, since format() is synchronous and the plugin is not. */
let deviceModel: string | null = null
if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Device')) {
  Device.getInfo()
    .then(({ model }) => {
      deviceModel = model
    })
    .catch(() => {
      // The header falls back to navigator.platform.
    })
}

/** Records the touch path of a gesture, keeping only the most recent GESTURE_TRACE_COUNT. The traces are persisted to their own key and rendered in a single `--- gestures` section by format(), rather than appended as entries, so that recording them never grows the log. No-op when logging is disabled. Never throws. */
const logGestureTrace = (trace: GestureTrace): void => {
  if (!enabled) return
  try {
    gestureTraces = [...gestureTraces, { ...trace, points: trace.points.slice(0, GESTURE_TRACE_MAX_POINTS) }].slice(
      -GESTURE_TRACE_COUNT,
    )
    storage.setItem(GESTURE_TRACES_KEY, JSON.stringify(gestureTraces))
  } catch {
    // Logging must never throw.
  }
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
  return shortenIds(
    `${thought.id} ${JSON.stringify(value)} rank:${thought.rank} parent:${thought.parentId}${thought.pending ? ' pending' : ''}`,
  )
}

/** Renders the buffer to a copy-friendly, one-line-per-entry text block for pasting into an issue. Prepends a header identifying the device, user agent, em version, build commit, display and the URL the log was formatted on, and how many earlier entries the rolling buffer has evicted. Appends the last-frame marker, the touch paths of the last five gestures and, when state is provided, the view the log ended on (cursor, caret offset, keyboard, note focus, and the sizes of the expanded set, multicursor set and undo/redo stacks) and a compact dump of state.thoughts.thoughtIndex (one line per thought, grouped by parent and ordered by rank) so entry ids can be resolved to values and current sibling order is visible. */
const format = (state?: State): string => {
  // The device: the hardware model in the native app, or else the navigator platform, the shell em is served through (web, ios, android, or tauri), the screen
  // dimensions, and the pointer type. The shell is worth naming separately because it is not recoverable from the user
  // agent: a Capacitor WebView shares its user agent with the mobile browser it embeds, and the Tauri desktop shell
  // reports the web platform to Capacitor, so only the flag its runtime injects tells it apart from a browser.
  const device = [
    `${deviceModel ?? ((typeof navigator !== 'undefined' && navigator.platform) || 'unknown platform')} (${isTauri() ? 'tauri' : Capacitor.getPlatform()})`,
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : 'unknown screen',
    isTouch ? 'touch' : 'mouse',
  ].join(', ')

  // The display: whether em runs as an installed PWA or in a browser tab, the screen orientation, the device pixel ratio,
  // the pinch-zoom scale of the visual viewport, and the bottom safe-area inset. Several iOS scroll and layout bugs
  // depend on these. Read at format time, when a forced style recalculation costs nothing that matters.
  const display =
    typeof window !== 'undefined'
      ? [
          navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches ? 'standalone' : 'browser',
          window.screen?.orientation?.type ?? 'unknown orientation',
          `dpr ${window.devicePixelRatio}`,
          `scale ${window.visualViewport?.scale ?? 1}`,
          `safe-area-bottom ${getSafeAreaBottom()}`,
        ].join(', ')
      : 'unknown'

  // The header is rendered here rather than read back from the session marker, which the rolling buffer evicts once
  // capacity is exceeded — i.e. in exactly the long sessions whose logs are most worth reading. It describes the device
  // and build the log was formatted on, so a hydrated log spanning an app update may still carry a session marker from
  // the version that wrote the older entries. The URL is what tells production, a preview deployment and localhost apart.
  const header = [
    `--- device: ${device}`,
    `--- userAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
    `--- version: ${pkg.version}`,
    `--- commit: ${__COMMIT_HASH__}`,
    `--- display: ${display}`,
    `--- url: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
    // seq counts every entry since the last clear(), so the first retained seq is the number the rolling buffer has
    // evicted. Spelled out so a reader can tell a log that wrapped from one that holds the whole session.
    ...((entries[0]?.seq ?? 0) > 0 ? [`--- evicted: ${entries[0].seq} earlier entries`] : []),
  ].join('\n')

  // a `--- date` line before the first entry and wherever the date changes, since each entry carries only the time
  const entryLines = entries
    .flatMap((entry, i) =>
      i === 0 || utcDate(entry.t) !== utcDate(entries[i - 1].t)
        ? [`--- date: ${utcDate(entry.t)}`, formatEntry(entry)]
        : [formatEntry(entry)],
    )
    .join('\n')

  let markerLine = ''
  try {
    const marker = storage.getItem(FRAME_MARKER_KEY)
    markerLine = marker ? `\n--- lastFrameAt: ${new Date(Number(marker)).toISOString()}` : ''
  } catch {
    // ignore
  }

  // One line per recent gesture: the time of its touchstart, the sequence it ended with, and every point as ms:x,y.
  const gestureLines =
    gestureTraces.length > 0
      ? [
          `\n--- gestures: last ${gestureTraces.length}, points as ms:x,y from touchstart`,
          ...gestureTraces.map(
            trace =>
              `${new Date(trace.t).toISOString().slice(11, 23)} ${JSON.stringify(trace.sequence)}${trace.abandon ? ' abandoned' : ''} ${trace.points.map(([ms, x, y]) => `${ms}:${x},${y}`).join(' ')}`,
          ),
        ].join('\n')
      : ''

  // The view the log ended on, which the entries can only reconstruct from setCursor and similar actions — the first
  // to be evicted in a long session. Thought ids resolve against the state.thoughts dump that follows.
  const view = state
    ? `\n--- state: ${shortenIds(
        JSON.stringify({
          cursor: state.cursor,
          cursorOffset: state.cursorOffset,
          isKeyboardOpen: state.isKeyboardOpen,
          noteFocus: state.noteFocus,
          expanded: Object.keys(state.expanded).length,
          multicursors: Object.keys(state.multicursors).length,
          undo: state.undoPatches.length,
          redo: state.redoPatches.length,
        }),
      )}`
    : ''

  const dump = state
    ? [
        `\n--- state.thoughts: ${Object.keys(state.thoughts.thoughtIndex).length} thoughts, ${Object.keys(state.thoughts.lexemeIndex).length} lexemes`,
        ...Object.values(state.thoughts.thoughtIndex)
          .sort((a, b) => (a.parentId < b.parentId ? -1 : a.parentId > b.parentId ? 1 : a.rank - b.rank))
          .map(formatThought),
      ].join('\n')
    : ''

  return `${header}${entryLines ? `\n${entryLines}` : ''}${markerLine}${gestureLines}${view}${dump}`
}

/** Empties the buffer and removes all of its localStorage keys, including the legacy single-key buffer, the frame marker and the gesture traces. */
const clear = (): void => {
  entries = []
  gestureTraces = []
  chunk = []
  seq = 0
  lastTime = 0
  try {
    storage.removeItem(DEBUG_LOG_KEY)
    storage.removeItem(FRAME_MARKER_KEY)
    storage.removeItem(GESTURE_TRACES_KEY)
    Array.from({ length: CHUNK_COUNT }, (_, i) => storage.removeItem(chunkKey(i)))
  } catch {
    // ignore
  }
}

/**
 * Restores the in-memory state to a clean slate: logging off, the frame heartbeat cancelled, the buffer and its
 * counters empty, the console mirror off. Run at test boundaries through resetStores (see registerReset); nothing in
 * the app calls it.
 *
 * The clean slate is written out here rather than derived from the values these variables were constructed with,
 * because those are not clean: `entries`, `seq` and `chunk` are initialized from whatever localStorage held at import,
 * i.e. a previous session's log. What is restored instead is what a module load produces against empty storage on a
 * host that does not auto-enable.
 *
 * Memory only. Erasing the persisted log is clear()'s job and stays a separate operation: a test owns its own
 * localStorage, and resetting between tests must never be able to cost a user their log.
 *
 * The heartbeat has to be cancelled, not just forgotten. Fake timers fake requestAnimationFrame, so a loop left
 * running makes vi.runAllTimersAsync spin until it aborts ("Aborting after running 100000 timers") — in whichever
 * teardown drains timers next, far from the test that enabled logging. And a loop that died with a reinstalled fake
 * clock while `frameId` stayed set could never be restarted, since startFrameHeartbeat returns early on a live handle.
 */
const reset = (): void => {
  stopFrameHeartbeat()
  enabled = false
  consoleEnabled = false
  entries = []
  gestureTraces = []
  chunk = []
  seq = 0
  lastTime = 0
  lastMirroredDate = ''
  lastFrameTime = 0
  lastMarkerWritten = 0
}

registerReset(reset)

/** Returns whether logging is currently active. */
const isEnabled = (): boolean => enabled

/** Enables or disables logging. Enabling records a session marker (environment metadata) and starts the frame heartbeat; disabling stops the heartbeat. Idempotent. */
const setEnabled = (value: boolean): void => {
  if (value === enabled) return
  enabled = value
  if (enabled) {
    log('session', () => ({
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screen: typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : '',
      mode: import.meta.env.MODE,
      appVersion: pkg.version,
      commitHash: __COMMIT_HASH__,
    }))
    startFrameHeartbeat()
  } else {
    stopFrameHeartbeat()
  }
}

/** Returns whether entries are currently being mirrored to the console. */
const isConsole = (): boolean => consoleEnabled

/**
 * Turns console mirroring on or off and records the choice in localStorage, so it survives the page reloads
 * that a reproduction performs. Off by default on every host, including the development and preview hosts
 * where logging itself auto-enables: the log captures every selectionchange and input event, which would
 * bury the console for everyone. Never throws.
 *
 * Mirrored lines carry the same shape format() writes, behind a `debugLog` prefix, so a log read off the
 * console and one dumped from the buffer are the same text. Intended for watching a single interaction live
 * through a browser MCP's console listing; for a whole reproduction, dump the buffer to a file instead —
 * a few steps of editing produce thousands of characters. See docs/debug-log.md.
 *
 * Note that localStorage.clear() removes this flag along with everything else, so re-arm the mirror after
 * resetting app state.
 */
const setConsole = (value: boolean): void => {
  consoleEnabled = value
  // a mirror turned back on starts a new excerpt, which needs its own date line
  lastMirroredDate = ''
  try {
    if (value) {
      storage.setItem(CONSOLE_KEY, 'true')
    } else {
      storage.removeItem(CONSOLE_KEY)
    }
  } catch {
    // The mirror must never interfere with the app.
  }
}

/** Records an uncaught error as an `error` entry with its name, message and stack, so a crash leaves its stack in the log after the console that printed it is gone. Accepts any thrown value, since a rejected promise or a `throw` can carry a non-Error. The source names where it was caught, e.g. `window`, `unhandledrejection` or `render`; extra fields such as a React component stack are passed through. */
const logError = (source: string, error: unknown, fields?: Record<string, unknown>): void => {
  if (!enabled) return
  try {
    // Built here rather than in the fields callback, where a throw would be swallowed by log and skip the fallback
    // below. Logging is known to be enabled at this point, so nothing is computed in vain.
    const errorFields =
      error instanceof Error
        ? { source, name: error.name, message: error.message, stack: error.stack, ...fields }
        : { source, message: typeof error === 'string' ? error : (JSON.stringify(error) ?? String(error)), ...fields }
    log('error', () => errorFields)
  } catch {
    // The thrown value could not be stringified (e.g. a circular object), which must not cost the entry.
    log('error', () => ({ source, message: '[unserializable]', ...fields }))
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
  isConsole,
  isEnabled,
  log,
  logError,
  logGestureTrace,
  read,
  setAutoOptOut,
  setConsole,
  setEnabled,
}

export default debugLog
