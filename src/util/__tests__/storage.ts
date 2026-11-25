import storage from '../storage'

beforeEach(() => {
  localStorage.clear()
})

// these type assertions are done at compile-time
it('types', () => {
  const testModel = storage.model({
    someArray: {
      default: [] as string[],
      encode: (value: string[]) => value.join('-'),
      decode: (s: string | null) => (s ? s.split('-') : []),
    },
    someBool: { default: false },
    someNumber: { default: 18 },
    noDefault: { decode: () => 'noDefault' },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type NonAny<T> = T extends any ? (any extends T ? never : T) : T

  /** Asserts that a value is not typed as any. */
  const assertNotAny = <T>(value: NonAny<T>) => true

  /** Asserts the type of an expression. */
  const assertType = <T>(value: T) => true

  assertType<string[]>(testModel.get('someArray'))
  assertType<boolean>(testModel.get('someBool'))
  assertType<number>(testModel.get('someNumber'))
  assertType<string | undefined>(testModel.get('noDefault'))
  assertNotAny(testModel.get('someArray'))
  assertNotAny(testModel.get('someBool'))
  assertNotAny(testModel.get('someNumber'))
  assertNotAny(testModel.get('noDefault'))
})

describe('get', () => {
  it('get a value that has been set', () => {
    const storageModel = storage.model({
      x: {},
    })
    storageModel.set('x', 'test')
    const value = storageModel.get('x')
    expect(value).toBe('test')
  })

  it('return undefined if no value has been set and there is no default', () => {
    const storageModel = storage.model({
      x: {},
    })
    const value = storageModel.get('x')
    expect(value).toBe(undefined)
  })

  it('return default if no value has been set', () => {
    const storageModel = storage.model({
      x: {
        default: 'hello',
      },
    })
    const value = storageModel.get('x')
    expect(value).toBe('hello')
  })
})

describe('set', () => {
  it('setter function', () => {
    /** Increment a number. */
    const inc = (n: number) => n + 1
    const storageModel = storage.model({
      n: {
        default: 0,
      },
    })
    storageModel.set('n', inc)
    storageModel.set('n', inc)
    storageModel.set('n', inc)
    const value = storageModel.get('n')
    expect(value).toBe(3)
  })
})

describe('remove', () => {
  it('remove a single key', () => {
    const storageModel = storage.model({
      x: {},
      y: {},
    })
    storageModel.set('x', 'a')
    storageModel.set('y', 'b')

    storageModel.remove('x')
    expect(storageModel.get('x')).toBe(undefined)
    expect(storageModel.get('y')).toBe('b')
  })
})

describe('clear', () => {
  it('clears all storage', () => {
    const storageModel = storage.model({
      x: {},
      y: {},
    })
    storageModel.set('x', 'test')
    storageModel.set('y', 'test')

    storage.clear()
    const value = storageModel.get('x')
    expect(value).toBe(undefined)
  })
})

describe('encode/decode', () => {
  it('default JSON.stringify + JSON.parse for non-string values', () => {
    const storageModel = storage.model({
      bool: { default: false },
      null: { default: null },
      num: { default: 1 },
      obj: { default: { a: 1 } },
      str: { default: 'test' },
    })
    expect(storageModel.get('bool')).toEqual(false)
    expect(storageModel.get('null')).toEqual(null)
    expect(storageModel.get('num')).toEqual(1)
    expect(storageModel.get('obj')).toEqual({ a: 1 })
    expect(storageModel.get('str')).toEqual('test')
  })

  it('explicit encode + decode', () => {
    const storageModel = storage.model({
      x: {
        encode: (value: string[]) => value.join('-'),
        decode: (s: string | null) => (s ? s.split('-') : []),
      },
    })
    storageModel.set('x', ['a', 'b', 'c'])
    const value = storageModel.get('x')
    expect(value).toEqual(['a', 'b', 'c'])
  })

  it('fall back to default if decode returns null or undefined', () => {
    const storageModel = storage.model({
      x: {
        default: 0,
        decode: (s: string | null) => (s ? +s : undefined),
      },
    })
    expect(storageModel.get('x')).toBe(0)
    storageModel.set('x', 1)
    expect(storageModel.get('x')).toBe(1)
  })
})

// https://github.com/cybersemics/em/issues/6156
describe('long values', () => {
  /** Returns every key and value in localStorage. */
  const stored = () =>
    Array.from({ length: localStorage.length }, (_, i) => {
      const key = localStorage.key(i)!
      return [key, localStorage.getItem(key)!] as const
    })

  it('stores a long value in slices of at most 512 characters, and reads it back whole', () => {
    const value = 'abcdefghij'.repeat(500)
    const storageModel = storage.model({ ids: { default: [] as string[] } })
    const ids = Array.from({ length: 100 }, (_, i) => `${i}`.padStart(32, '0'))

    storage.setItem('long', value)
    storageModel.set('ids', ids)
    // a short value that begins as a header does is not mistaken for one
    storage.setItem('marked', '\u001F2:abc')

    expect(Math.max(...stored().map(([, slice]) => slice.length))).toBeLessThanOrEqual(512)
    expect(storage.getItem('long')).toBe(value)
    expect(storageModel.get('ids')).toEqual(ids)
    expect(storage.getItem('marked')).toBe('\u001F2:abc')
  })

  it('rewrites only the slices that changed when a long value is appended to', () => {
    storage.setItem('long', 'abcdefghij'.repeat(200))
    const setItem = vi.spyOn(localStorage, 'setItem')
    // The localStorage of the test environment is a mock that keeps every call made to it.
    setItem.mockClear()

    storage.setItem('long', 'abcdefghij'.repeat(200) + 'k')

    // the slice that the appended character starts, and the header
    expect(setItem).toHaveBeenCalledTimes(2)
    expect(storage.getItem('long')).toBe('abcdefghij'.repeat(200) + 'k')
    setItem.mockRestore()
  })

  it('removes the slices that a shorter value leaves over, and the slices of a removed value', () => {
    storage.setItem('long', 'x'.repeat(2000))
    storage.setItem('other', 'value')

    storage.setItem('long', 'y'.repeat(600))
    expect(stored()).toHaveLength(4)
    expect(storage.getItem('long')).toBe('y'.repeat(600))

    storage.setItem('long', 'short')
    expect(stored()).toHaveLength(2)
    expect(storage.getItem('long')).toBe('short')

    storage.setItem('long', 'z'.repeat(2000))
    storage.removeItem('long')
    expect(stored()).toEqual([['other', 'value']])
  })

  it('reads a long value whose slices do not match its header as no value', () => {
    storage.setItem('long', 'x'.repeat(2000))

    // a slice written before a crash, without the header written after it
    localStorage.setItem('long\u001F1', 'y'.repeat(512))

    expect(storage.getItem('long')).toBeNull()
  })
})
