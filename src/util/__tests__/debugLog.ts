import { vi } from 'vitest'
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
    for (let i = 0; i < 600; i++) {
      debugLog.log('n', { i })
    }
    const entries = debugLog.read()
    expect(entries.length).toBe(500)
    // the oldest 100 were dropped, so the first retained entry is #100
    expect(entries[0].i).toBe(100)
    expect(entries[entries.length - 1].i).toBe(599)
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
  it('persists entries to localStorage synchronously', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    debugLog.log('persisted')
    const raw = storage.getItem('debugLog')
    expect(raw).toBeTruthy()
    expect((JSON.parse(raw!) as { type: string }[]).some(e => e.type === 'persisted')).toBe(true)
  })

  it('hydrates a prior session log on module load', async () => {
    // seed localStorage as if a prior (crashed) session had persisted a log
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
  it('empties the buffer and removes the localStorage key', () => {
    debugLog.setEnabled(true)
    debugLog.log('x')
    debugLog.clear()
    expect(debugLog.read()).toEqual([])
    expect(storage.getItem('debugLog')).toBeNull()
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
})
