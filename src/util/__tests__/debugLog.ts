import { vi } from 'vitest'
import pkg from '../../../package.json'
import State from '../../@types/State'
import { resetStores } from '../../stores/ministore'
import debugLog from '../debugLog'
import storage from '../storage'

// debugLog's in-memory state is restored after every test by setupTests (see reset in debugLog.ts). Storage is this
// suite's own: reset deliberately leaves it alone, so it is cleared here.
beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// https://github.com/cybersemics/em/issues/5258
describe('isolation between tests', () => {
  // The two tests are a pair: the first leaves logging enabled with an entry in the buffer and cleans up nothing, and
  // the second passes only if that did not reach it.
  it('a test may leave logging enabled', () => {
    debugLog.setEnabled(true)
    debugLog.log('leak')
    expect(debugLog.read().length).toBeGreaterThan(0)
  })

  it('the next test starts with logging off and an empty buffer', () => {
    expect(debugLog.isEnabled()).toBe(false)
    expect(debugLog.read()).toEqual([])
  })
})

describe('reset', () => {
  it('turns logging off and empties the buffer without erasing the persisted log', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('x')
    expect(storage.getItem('debugLog-0')).not.toBeNull()

    resetStores()

    expect(debugLog.isEnabled()).toBe(false)
    expect(debugLog.read()).toEqual([])
    // Unlike clear(), which exists to erase the log.
    expect(storage.getItem('debugLog-0')).not.toBeNull()
  })

  it('turns the console mirror off', () => {
    debugLog.setConsole(true)

    resetStores()

    expect(debugLog.isConsole()).toBe(false)
  })

  it('cancels the frame heartbeat, so that draining fake timers terminates', async () => {
    vi.useFakeTimers()
    debugLog.setEnabled(true)
    // the heartbeat is a self-rescheduling requestAnimationFrame, which fake timers fake
    expect(vi.getTimerCount()).toBe(1)

    resetStores()

    expect(vi.getTimerCount()).toBe(0)
    await vi.runAllTimersAsync()
    vi.useRealTimers()
  })

  it('lets the heartbeat start again afterwards', () => {
    vi.useFakeTimers()
    debugLog.setEnabled(true)
    resetStores()

    debugLog.setEnabled(true)

    expect(vi.getTimerCount()).toBe(1)
    expect(debugLog.read().filter(entry => entry.type === 'session')).toHaveLength(1)
    vi.useRealTimers()
  })
})

describe('enabled gate', () => {
  it('log is a no-op when disabled', () => {
    debugLog.log('test', { a: 1 })
    expect(debugLog.read()).toEqual([])
  })

  it('does not compute the fields when disabled', () => {
    const fields = vi.fn(() => ({ a: 1 }))
    debugLog.log('test', fields)
    expect(fields).not.toHaveBeenCalled()
  })

  it('records the fields returned by a function', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('test', () => ({ a: 1 }))
    expect(debugLog.read()).toMatchObject([{ type: 'test', a: 1 }])
  })

  it('drops only the entry whose fields throw', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    expect(() =>
      debugLog.log('broken', () => {
        throw new Error('detached node')
      }),
    ).not.toThrow()
    debugLog.log('next')
    expect(debugLog.read().map(entry => [entry.type, entry.seq])).toEqual([['next', 0]])
  })

  it('records entries when enabled', () => {
    debugLog.setEnabled(true)
    debugLog.log('test', { a: 1 })
    const entries = debugLog.read()
    const last = entries[entries.length - 1]
    expect(last.type).toBe('test')
    expect(last.a).toBe(1)
  })

  it('records a session marker when enabled', () => {
    debugLog.setEnabled(true)
    expect(debugLog.read().some(e => e.type === 'session')).toBe(true)
  })

  it('includes appVersion and commitHash in the session marker', () => {
    debugLog.setEnabled(true)
    const session = debugLog.read().find(e => e.type === 'session')
    expect(typeof session?.appVersion).toBe('string')
    expect((session?.appVersion as string).length).toBeGreaterThan(0)
    expect(typeof session?.commitHash).toBe('string')
  })

  it('setEnabled is idempotent (no duplicate session markers)', () => {
    debugLog.setEnabled(true)
    debugLog.setEnabled(true)
    expect(debugLog.read().filter(e => e.type === 'session').length).toBe(1)
  })
})

describe('common envelope', () => {
  it('assigns a monotonically increasing seq', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('a')
    debugLog.log('b')
    const entries = debugLog.read()
    expect(entries[0].seq).toBe(0)
    expect(entries[1].seq).toBe(1)
  })
})

describe('capacity', () => {
  it('trims to the capacity, keeping the most recent entries', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    for (let i = 0; i < 5100; i++) {
      debugLog.log('n', { i })
    }
    const entries = debugLog.read()
    expect(entries.length).toBe(5000)
    // the oldest 100 were dropped, so the first retained entry is #100
    expect(entries[0].i).toBe(100)
    expect(entries[entries.length - 1].i).toBe(5099)
  })
})

describe('field cap', () => {
  it('truncates over-long string fields', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    const long = 'x'.repeat(5000)
    debugLog.log('big', { value: long })
    const last = debugLog.read().slice(-1)[0]
    expect((last.value as string).length).toBeLessThan(long.length)
    expect(last.value as string).toContain('…')
  })
})

describe('persistence', () => {
  it('persists entries to the active chunk key synchronously', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('persisted')
    const raw = storage.getItem('debugLog-0')
    expect(raw).toBeTruthy()
    expect((JSON.parse(raw!) as { type: string }[]).some(e => e.type === 'persisted')).toBe(true)
  })

  it('rotates to the next chunk key so appending an entry only rewrites the active chunk', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    for (let i = 0; i < 501; i++) {
      debugLog.log('n', { i })
    }
    expect((JSON.parse(storage.getItem('debugLog-0')!) as unknown[]).length).toBe(500)
    expect((JSON.parse(storage.getItem('debugLog-1')!) as unknown[]).length).toBe(1)
  })

  it('hydrates chunked entries from a prior session on module load', async () => {
    // seed localStorage as if a prior (crashed) session had persisted chunks
    localStorage.setItem('debugLog-3', JSON.stringify([{ seq: 1500, t: 1, dt: 0, type: 'priorChunk' }]))
    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.read().some(e => e.type === 'priorChunk')).toBe(true)
  })

  it('hydrates a legacy single-key log from a prior session on module load', async () => {
    // seed localStorage as if a session on a pre-chunking version had persisted a log
    localStorage.setItem('debugLog', JSON.stringify([{ seq: 0, t: 1, dt: 0, type: 'prior' }]))
    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.read().some(e => e.type === 'prior')).toBe(true)
  })

  it('never throws when localStorage.setItem fails (e.g. quota exceeded)', () => {
    debugLog.setEnabled(true)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => debugLog.log('overflow', () => ({ value: 'y'.repeat(1000) }))).not.toThrow()
  })
})

describe('clear', () => {
  it('empties the buffer and removes the localStorage keys', () => {
    debugLog.setEnabled(true)
    debugLog.log('x')
    localStorage.setItem('debugLog-frame', '123')
    debugLog.clear()
    expect(debugLog.read()).toEqual([])
    expect(storage.getItem('debugLog')).toBeNull()
    expect(storage.getItem('debugLog-0')).toBeNull()
    expect(storage.getItem('debugLog-frame')).toBeNull()
  })
})

describe('format', () => {
  it('renders the device, user agent, em version, build commit, display, and URL as the first six lines', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('input')
    const lines = debugLog.format().split('\n')
    // the device names the navigator platform (empty in jsdom), the shell, the screen, and the pointer type
    expect(lines[0]).toMatch(/^--- device: .+ \((web|ios|android|tauri)\), \d+x\d+, (touch|mouse)$/)
    expect(lines[1]).toBe(`--- userAgent: ${navigator.userAgent}`)
    expect(lines[2]).toBe(`--- version: ${pkg.version}`)
    expect(lines[3]).toBe(`--- commit: ${__COMMIT_HASH__}`)
    // jsdom reports no standalone display mode, no orientation and no visual viewport
    expect(lines[4]).toMatch(/^--- display: browser, .+, dpr \d+(\.\d+)?, scale [\d.]+, safe-area-bottom \d+$/)
    expect(lines[5]).toBe(`--- url: ${window.location.href}`)
    expect(lines[6]).toMatch(/^--- date: \d{4}-\d{2}-\d{2}$/)
    expect(lines[7]).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3} \+\d+ms #0 input$/)
  })

  it('names the tauri shell, which Capacitor reports as web', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    // the flag the Tauri runtime injects into the WebView, which is what @tauri-apps/api reads to detect the shell
    vi.stubGlobal('isTauri', true)
    expect(debugLog.format().split('\n')[0]).toContain('(tauri)')
  })

  it('renders the header even when the buffer is empty, so a log with no entries still identifies the build', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    const lines = debugLog.format().split('\n')
    expect(lines.length).toBe(6)
    expect(lines[3]).toBe(`--- commit: ${__COMMIT_HASH__}`)
    expect(lines[5]).toBe(`--- url: ${window.location.href}`)
  })

  it('renders the header after the buffer overflows and the session marker is evicted', () => {
    debugLog.setEnabled(false)
    debugLog.clear()
    debugLog.setEnabled(true)
    for (let i = 0; i < 5100; i++) {
      debugLog.log('n', { i })
    }
    expect(debugLog.read().some(entry => entry.type === 'session')).toBe(false)
    const lines = debugLog.format().split('\n')
    expect(lines[0]).toMatch(/^--- device: /)
    expect(lines[3]).toBe(`--- commit: ${__COMMIT_HASH__}`)
    expect(lines[5]).toBe(`--- url: ${window.location.href}`)
    expect(lines[6]).toBe('--- evicted: 101 earlier entries')
    expect(lines[8]).toContain('#101 n')
  })

  it('reports how many entries the rolling buffer has evicted', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    Array.from({ length: 5003 }, (_, i) => debugLog.log('x', { i }))
    const lines = debugLog.format().split('\n')
    expect(lines[6]).toBe('--- evicted: 3 earlier entries')
    expect(lines[8]).toContain('#3 x')
  })

  it('omits the eviction line while the buffer holds the whole session', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('x')
    expect(debugLog.format()).not.toContain('--- evicted')
  })

  it('puts the actionType in the envelope and spreads the parsed payload into the fields', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('action', () => ({ actionType: 'indent', payload: JSON.stringify({ at: null, value: 'a' }) }))
    expect(debugLog.format()).toMatch(/ #0 action indent \{"at":null,"value":"a"\}$/m)
  })

  it('keeps a payload that does not parse, such as one cut by the field cap, as a string', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('action', () => ({ actionType: 'importText', payload: JSON.stringify({ text: 'x'.repeat(3000) }) }))
    expect(debugLog.format()).toMatch(/ #0 action importText \{"payload":"\{\\"text\\":\\"x+…\(\+\d+\)"\}$/m)
  })

  it('drops isComposing:false, a value repeating a reserved id, and the commandMetadata label and source', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    const home = '00000000000000000000000000000001'
    debugLog.log('keydown', { key: 'a', isComposing: false })
    debugLog.log('move', { id: home, value: home, oldRank: 0, newRank: 1 })
    debugLog.log('action', () => ({
      actionType: 'newThought',
      payload: JSON.stringify({
        commandMetadata: { source: 'command', commandId: 'newThought', label: 'New Thought' },
      }),
    }))
    const text = debugLog.format()
    expect(text).toMatch(/ #0 keydown \{"key":"a"\}$/m)
    expect(text).toMatch(new RegExp(` #1 move \\{"id":"${home}","oldRank":0,"newRank":1\\}$`, 'm'))
    expect(text).toMatch(/ #2 action newThought \{"commandMetadata":\{"commandId":"newThought"\}\}$/m)
  })

  it('shortens thought ids to ten characters and keeps reserved ids whole', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('setCursor', {
      path: ['00000000000000000000000000000001', '97e810f0c6ba2f31736f6dac650e0cfd'],
    })
    expect(debugLog.format()).toMatch(/ #0 setCursor \{"path":\["00000000000000000000000000000001","97e810f0c6"\]\}$/m)
  })

  it('writes a date line before the first entry and wherever the date changes', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(Date.parse('2026-10-10T23:59:59.000Z'))
    debugLog.log('a')
    debugLog.log('b')
    now.mockReturnValue(Date.parse('2026-10-11T00:00:01.000Z'))
    debugLog.log('c')
    now.mockRestore()
    const lines = debugLog.format().split('\n').slice(6)
    expect(lines[0]).toBe('--- date: 2026-10-10')
    expect(lines[1]).toMatch(/^23:59:59\.000 \+\d+ms #0 a$/)
    expect(lines[2]).toMatch(/^23:59:59\.000 \+\d+ms #1 b$/)
    expect(lines[3]).toBe('--- date: 2026-10-11')
    expect(lines[4]).toMatch(/^00:00:01\.000 \+\d+ms #2 c$/)
  })

  it('renders a one-line-per-entry text block', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('input', { data: ' ' })
    const text = debugLog.format()
    expect(text).toContain('input')
    expect(text).toContain('#0')
    expect(text).toContain('"data":" "')
  })

  it('appends the last-frame marker when present', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('x')
    localStorage.setItem('debugLog-frame', '1700000000000')
    const text = debugLog.format()
    expect(text).toContain('lastFrameAt: 2023-11-14T22:13:20.000Z')
  })

  it('appends a state.thoughts dump grouped by parent and ordered by rank', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('x')
    const state = {
      thoughts: {
        thoughtIndex: {
          t1: { id: 't1', value: 'apple', rank: 1, parentId: 'root', childrenMap: {} },
          t2: { id: 't2', value: 'banana', rank: 0, parentId: 'root', childrenMap: {}, pending: true },
        },
        lexemeIndex: {},
      },
      cursor: null,
      cursorOffset: null,
      isKeyboardOpen: false,
      noteFocus: false,
      expanded: {},
      multicursors: {},
      undoPatches: [],
      redoPatches: [],
    } as unknown as State
    const text = debugLog.format(state)
    expect(text).toContain('state.thoughts: 2 thoughts, 0 lexemes')
    expect(text).toContain('t1 "apple" rank:1 parent:root')
    expect(text).toContain('t2 "banana" rank:0 parent:root pending')
    // siblings are ordered by rank within a parent, so banana (rank 0) precedes apple (rank 1)
    expect(text.indexOf('banana')).toBeLessThan(text.indexOf('apple'))
  })
  it('renders the view the log ended on before the state.thoughts dump', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    const state = {
      thoughts: { thoughtIndex: {}, lexemeIndex: {} },
      cursor: ['t1', 't2'],
      cursorOffset: 3,
      isKeyboardOpen: true,
      noteFocus: false,
      expanded: { a: ['t1'], b: ['t1', 't2'] },
      multicursors: {},
      undoPatches: [{}, {}, {}],
      redoPatches: [{}],
    } as unknown as State
    const lines = debugLog.format(state).split('\n')
    const view = lines.findIndex(line => line.startsWith('--- state: '))
    expect(JSON.parse(lines[view].slice('--- state: '.length))).toEqual({
      cursor: ['t1', 't2'],
      cursorOffset: 3,
      isKeyboardOpen: true,
      noteFocus: false,
      expanded: 2,
      multicursors: 0,
      undo: 3,
      redo: 1,
    })
    expect(view).toBeLessThan(lines.findIndex(line => line.startsWith('--- state.thoughts:')))
  })
})

describe('gesture traces', () => {
  /** Records a gesture trace with a single point. */
  const logTrace = (sequence: string, t = 1700000000000) =>
    debugLog.logGestureTrace({ t, sequence, abandon: false, points: [[0, 10, 20]] })

  it('renders each trace as one line with every point as ms:x,y', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.logGestureTrace({
      t: 1700000000000,
      sequence: 'ld',
      abandon: false,
      points: [
        [0, 225, 424],
        [17, 214, 430],
        [33, 200, 445],
      ],
    })
    const lines = debugLog.format().split('\n')
    const heading = lines.findIndex(line => line.startsWith('--- gestures:'))
    expect(lines[heading]).toBe('--- gestures: last 1, points as ms:x,y from touchstart')
    expect(lines[heading + 1]).toBe('22:13:20.000 "ld" 0:225,424 17:214,430 33:200,445')
  })

  it('keeps only the five most recent traces', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    ;['r', 'l', 'u', 'd', 'rd', 'ld', 'ldl'].forEach(sequence => logTrace(sequence))
    const text = debugLog.format()
    expect(text).toContain('--- gestures: last 5,')
    expect(text.match(/^22:13:20\.000 "\w+"/gm)).toEqual([
      '22:13:20.000 "u"',
      '22:13:20.000 "d"',
      '22:13:20.000 "rd"',
      '22:13:20.000 "ld"',
      '22:13:20.000 "ldl"',
    ])
  })

  it('does not append entries to the buffer', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    logTrace('ld')
    expect(debugLog.read()).toEqual([])
  })

  it('marks an abandoned gesture', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.logGestureTrace({ t: 1700000000000, sequence: 'r', abandon: true, points: [[0, 10, 20]] })
    expect(debugLog.format()).toContain('22:13:20.000 "r" abandoned 0:10,20')
  })

  it('is a no-op when logging is disabled', () => {
    logTrace('ld')
    expect(debugLog.format()).not.toContain('--- gestures:')
    expect(storage.getItem('debugLog-gestures')).toBeNull()
  })

  it('hydrates the traces from a prior session on module load', async () => {
    debugLog.setEnabled(true)
    logTrace('ldl')
    vi.resetModules()
    const { default: reloaded } = await import('../debugLog')
    expect(reloaded.format()).toContain('22:13:20.000 "ldl" 0:10,20')
  })

  it('is emptied by clear', () => {
    debugLog.setEnabled(true)
    logTrace('ld')
    debugLog.clear()
    expect(debugLog.format()).not.toContain('--- gestures:')
    expect(storage.getItem('debugLog-gestures')).toBeNull()
  })
})

describe('logError', () => {
  it('records the name, message and stack of an Error', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    const error = new TypeError('boom')
    debugLog.logError('window', error, { filename: 'app.js' })
    expect(debugLog.read()).toEqual([
      expect.objectContaining({
        type: 'error',
        source: 'window',
        name: 'TypeError',
        message: 'boom',
        stack: expect.stringContaining('TypeError: boom'),
        filename: 'app.js',
      }),
    ])
  })

  it('records a thrown non-Error as its message', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.logError('unhandledrejection', 'plain string')
    debugLog.logError('unhandledrejection', { code: 42 })
    expect(debugLog.read().map(entry => entry.message)).toEqual(['plain string', '{"code":42}'])
  })

  it('still records an entry when the thrown value cannot be stringified', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    const circular: Record<string, unknown> = {}
    circular.self = circular
    debugLog.logError('unhandledrejection', circular)
    expect(debugLog.read()).toEqual([
      expect.objectContaining({ type: 'error', source: 'unhandledrejection', message: '[unserializable]' }),
    ])
  })

  it('is a no-op when logging is disabled', () => {
    debugLog.logError('window', new Error('boom'))
    expect(debugLog.read()).toEqual([])
  })
})

// Auto-enable is decided at module load, so each case stubs the environment, resets the module registry, and imports a fresh instance (the same pattern as the hydration test above). The localhost hostname comes from jsdom's default URL; the *.vercel.app case needs a different jsdom URL, which is only configurable per file, so it lives in debugLogVercel.ts.
describe('auto-enable', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    // no-ops unless the corresponding test failed before its own cleanup
    Reflect.deleteProperty(navigator, 'webdriver')
    vi.doUnmock('@capacitor/core')
  })

  it('does not auto-enable in the test environment', async () => {
    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.autoEnabled).toBe(false)
    expect(fresh.isEnabled()).toBe(false)
  })

  it('auto-enables on localhost outside the test environment and records a session marker', async () => {
    vi.stubEnv('MODE', 'development')
    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.autoEnabled).toBe(true)
    expect(fresh.isEnabled()).toBe(true)
    expect(fresh.read().some(e => e.type === 'session')).toBe(true)
    // stop the fresh instance's frame heartbeat so it cannot log into later tests
    fresh.setEnabled(false)
    expect(fresh.isEnabled()).toBe(false)
  })

  it('does not auto-enable in automated browser sessions (navigator.webdriver)', async () => {
    vi.stubEnv('MODE', 'development')
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true })
    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.autoEnabled).toBe(false)
    expect(fresh.isEnabled()).toBe(false)
  })

  it('does not auto-enable in the native Capacitor shell', async () => {
    vi.stubEnv('MODE', 'production')
    // getPlatform and isPluginAvailable are read at module load by src/browser.ts and debugLog's device model lookup,
    // so the double implements them too
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios', isPluginAvailable: () => false },
    }))
    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.autoEnabled).toBe(false)
    expect(fresh.isEnabled()).toBe(false)
  })

  it('respects a persisted device-local opt-out on load', async () => {
    localStorage.setItem('debugLogOptOut', 'true')
    vi.stubEnv('MODE', 'development')
    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.autoEnabled).toBe(true)
    expect(fresh.isEnabled()).toBe(false)
  })

  it('setAutoOptOut disables and re-enables logging and persists the choice', async () => {
    vi.stubEnv('MODE', 'development')
    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.isEnabled()).toBe(true)

    fresh.setAutoOptOut(true)
    expect(fresh.isEnabled()).toBe(false)
    expect(fresh.isAutoOptOut()).toBe(true)
    expect(localStorage.getItem('debugLogOptOut')).toBe('true')

    fresh.setAutoOptOut(false)
    expect(fresh.isEnabled()).toBe(true)
    expect(fresh.isAutoOptOut()).toBe(false)
    expect(localStorage.getItem('debugLogOptOut')).toBeNull()

    // stop the fresh instance's frame heartbeat so it cannot log into later tests
    fresh.setEnabled(false)
  })

  it('setAutoOptOut is a no-op off auto-enable hosts, so the opt-out cannot suppress the synced setting in production', () => {
    debugLog.setAutoOptOut(true)
    expect(localStorage.getItem('debugLogOptOut')).toBeNull()
    debugLog.setEnabled(true)
    expect(debugLog.isEnabled()).toBe(true)
  })
})

describe('console mirror', () => {
  beforeEach(() => {
    debugLog.setConsole(false)
  })

  afterEach(() => {
    debugLog.setConsole(false)
  })

  it('does not mirror to the console by default', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    debugLog.setEnabled(true)
    debugLog.log('test', { a: 1 })
    expect(info).not.toHaveBeenCalled()
  })

  it('mirrors each entry once it is turned on', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    debugLog.setEnabled(true)
    debugLog.setConsole(true)
    debugLog.log('test', { a: 1 })
    expect(info).toHaveBeenCalledTimes(2)
    expect(info.mock.calls[0][0]).toMatch(/^debugLog --- date: \d{4}-\d{2}-\d{2}$/)
    expect(info.mock.calls[1][0]).toMatch(/^debugLog \d{2}:\d{2}:\d{2}\.\d{3} \+\d+ms #\d+ test \{"a":1\}$/)
  })

  it('writes the date line again only when the date changes', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    debugLog.setEnabled(true)
    debugLog.setConsole(true)
    debugLog.log('a')
    debugLog.log('b')
    expect(info.mock.calls.filter(([line]) => (line as string).includes('--- date:'))).toHaveLength(1)
  })

  it('writes the date line again when the mirror is turned back on', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    debugLog.setEnabled(true)
    debugLog.setConsole(true)
    debugLog.log('a')
    debugLog.setConsole(false)
    debugLog.setConsole(true)
    debugLog.log('b')
    expect(info.mock.calls.filter(([line]) => (line as string).includes('--- date:'))).toHaveLength(2)
  })

  it('mirrors the same line that format() writes, so either source parses the same', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    debugLog.setEnabled(true)
    debugLog.setConsole(true)
    debugLog.log('test', { a: 1 })
    const mirrored = (info.mock.calls.at(-1)![0] as string).replace(/^debugLog /, '')
    expect(debugLog.format().split('\n')).toContain(mirrored)
  })

  it('stops mirroring when turned off', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    debugLog.setEnabled(true)
    debugLog.setConsole(true)
    debugLog.setConsole(false)
    debugLog.log('test', { a: 1 })
    expect(info).not.toHaveBeenCalled()
  })

  it('persists the choice so it survives a reload', async () => {
    debugLog.setConsole(true)
    expect(storage.getItem('debugLogConsole')).toBe('true')

    vi.resetModules()
    const fresh = (await import('../debugLog')).default
    expect(fresh.isConsole()).toBe(true)

    // stop the fresh instance's frame heartbeat so it cannot log into later tests
    fresh.setEnabled(false)
  })

  it('survives clear(), which empties the log but must leave the preference alone', () => {
    debugLog.setConsole(true)
    debugLog.clear()
    expect(debugLog.isConsole()).toBe(true)
    expect(storage.getItem('debugLogConsole')).toBe('true')
  })

  it('does not mirror while logging is disabled', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    debugLog.setConsole(true)
    debugLog.log('test', { a: 1 })
    expect(info).not.toHaveBeenCalled()
  })

  it('a throwing console cannot cost an entry its place in the buffer', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {
      throw new Error('console is gone')
    })
    debugLog.setEnabled(true)
    debugLog.setConsole(true)
    expect(() => debugLog.log('test', { a: 1 })).not.toThrow()
    expect(debugLog.read().some(entry => entry.type === 'test')).toBe(true)
  })
})
