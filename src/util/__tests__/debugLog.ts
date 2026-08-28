import { vi } from 'vitest'
import State from '../../@types/State'
import debugLog from '../debugLog'
import storage from '../storage'

beforeEach(() => {
  localStorage.clear()
  debugLog.setEnabled(false)
  debugLog.clear()
})

afterEach(() => {
  debugLog.setEnabled(false)
  vi.restoreAllMocks()
})

describe('enabled gate', () => {
  it('log is a no-op when disabled', () => {
    debugLog.log('test', { a: 1 })
    expect(debugLog.read()).toEqual([])
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
    expect(() => debugLog.log('overflow', { value: 'y'.repeat(1000) })).not.toThrow()
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
    } as unknown as State
    const text = debugLog.format(state)
    expect(text).toContain('state.thoughts: 2 thoughts, 0 lexemes')
    expect(text).toContain('t1 "apple" rank:1 parent:root')
    expect(text).toContain('t2 "banana" rank:0 parent:root pending')
    // siblings are ordered by rank within a parent, so banana (rank 0) precedes apple (rank 1)
    expect(text.indexOf('banana')).toBeLessThan(text.indexOf('apple'))
  })
})
