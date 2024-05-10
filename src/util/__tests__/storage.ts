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
    noDefault: { decode: (s: string | null) => 'noDefault' },
  })

  /* eslint-disable @typescript-eslint/no-unused-vars */
  type NonAny<T> = 0 extends 1 & T ? never : unknown

  /** Asserts that a value is not typed as any. */
  const assertNotAny = <T extends NonAny<T>>(value: T) => true

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
