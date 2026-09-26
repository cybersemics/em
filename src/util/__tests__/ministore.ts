import _ from 'lodash'
import ministore, { registerReset, resetStores } from '../../stores/ministore'
import reactMinistore from '../../stores/react-ministore'

/** A module-level store, as every store under src/stores is. Vitest isolates modules per file, not per test, so it outlives each test in this file. */
const moduleStore = ministore(0)

it('getState', () => {
  const store = ministore(1)
  expect(store.getState()).toBe(1)
})

it('update', () => {
  const store = ministore(1)
  store.update(2)
  expect(store.getState()).toBe(2)
})

it('update partial', () => {
  const store = ministore({ a: 1, b: 2 })
  store.update({ a: 3 })
  expect(store.getState()).toEqual({ a: 3, b: 2 })
})

it('update an object from null', () => {
  const store = ministore<{ a: number; b: number } | null>(null)
  store.update({ a: 1, b: 2 })
  expect(store.getState()).toEqual({ a: 1, b: 2 })
  store.update({ b: 3 })
  expect(store.getState()).toEqual({ a: 1, b: 3 })
  store.update(null)
  expect(store.getState()).toBeNull()
})

describe('reset', () => {
  it('restore the initial state', () => {
    const store = ministore({ a: 1, b: 2 })
    store.update({ a: 3 })
    store.reset()
    expect(store.getState()).toEqual({ a: 1, b: 2 })
  })

  it('trigger subscribers', () => {
    let counter = 0
    const store = ministore(0)
    store.update(1)
    store.subscribe(() => counter++)
    store.reset()
    expect(counter).toBe(1)
    expect(store.getState()).toBe(0)
  })

  it('only trigger if state has changed', () => {
    let counter = 0
    const store = ministore(0)
    store.subscribe(() => counter++)
    store.reset()
    expect(counter).toBe(0)
  })
})

// These two tests depend on their order: the first leaves state behind, the second checks that no hand-written teardown
// was needed to clear it. Together they pin the afterEach in setupTests.ts, which is the only reset for a suite that
// uses neither initStore nor createTestApp.
// https://github.com/cybersemics/em/issues/5245
describe('isolation between tests', () => {
  it('leave a module-level store changed', () => {
    moduleStore.update(1)
    expect(moduleStore.getState()).toBe(1)
  })

  it('see the initial state without resetting it', () => {
    expect(moduleStore.getState()).toBe(0)
  })
})

describe('resetStores', () => {
  it('reset every store', () => {
    const storeA = ministore(1)
    const storeB = ministore({ a: 1, b: 2 })
    storeA.update(2)
    storeB.update({ a: 3 })

    resetStores()

    expect(storeA.getState()).toBe(1)
    expect(storeB.getState()).toEqual({ a: 1, b: 2 })
  })

  it('recompute a composed store when its sources are reset', () => {
    const storeA = ministore(1)
    const storeB = ministore(2)
    const composite = ministore.compose((state1: number, state2: number) => 10 * state1 + state2, [storeA, storeB])
    storeA.update(3)
    expect(composite.getState()).toBe(32)

    resetStores()

    expect(composite.getState()).toBe(12)
  })
})

describe('registerReset', () => {
  it('runs a registered reset before the stores are reset, so that it still sees the state it has to tear down', () => {
    const store = ministore(1)
    store.update(2)
    const seen: number[] = []
    registerReset(() => seen.push(store.getState()))

    resetStores()

    expect(seen).toEqual([2])
    expect(store.getState()).toBe(1)
  })
})

describe('subscribe', () => {
  it('subscribe to an update', () => {
    let counter = 0
    const store = ministore(0)
    store.subscribe(n => (counter += n))
    store.update(1)
    expect(counter).toBe(1)
  })

  it('unsubscribe', () => {
    let counter = 0
    const store = ministore(0)
    const unsubscribe = store.subscribe(n => (counter += n))
    store.update(1)
    expect(counter).toBe(1)

    unsubscribe()
    store.update(2)
    expect(counter).toBe(1)
  })

  it('only trigger if state has changed', () => {
    let counter = 0
    const store = ministore(0)
    store.subscribe(() => counter++)
    store.update(1)
    store.update(1)
    expect(counter).toBe(1)
  })
})

describe('subscribeSelector', () => {
  it('subscribe to a slice of state', () => {
    let counter = 0
    const store = ministore({ a: 1, b: 4 })
    store.subscribeSelector(
      state => state.a,
      a => (counter += a),
    )
    store.update({ a: 2 })
    expect(counter).toBe(2)
  })

  it('unsubscribe', () => {
    let counter = 0
    const store = ministore({ a: 1, b: 4 })
    const unsubscribe = store.subscribeSelector(
      state => state.a,
      a => (counter += a),
    )
    store.update({ a: 2 })
    expect(counter).toBe(2)

    unsubscribe()
    store.update({ a: 3 })
    expect(counter).toBe(2)
  })

  it('only trigger if slice has changed', () => {
    let counter = 0
    const store = ministore({ a: 1, b: 4 })
    store.subscribeSelector(
      state => state.a,
      () => counter++,
    )
    store.update({ a: 2 })
    store.update({ a: 2, b: 5 })
    expect(counter).toBe(1)
  })

  it('custom equals function', () => {
    let counter = 0
    const store = ministore({ a: 1, b: 4 })
    store.subscribeSelector(
      state => ({ x: state.a }),
      () => counter++,
      _.isEqual,
    )
    store.update({ a: 2 })
    store.update({ a: 2, b: 5 })
    expect(counter).toBe(1)
  })
})

describe('once', () => {
  it('subscribe to one update', async () => {
    const store = ministore(0)
    const promise = store.once()
    store.update(1)
    store.update(2)
    expect(await promise).toBe(1)
  })

  it('cancel before it resolves', async () => {
    let counter = 0
    const store = ministore(0)
    const promise = store.once()
    promise.then(n => (counter += n))
    promise.cancel()
    store.update(1)
    await Promise.resolve()
    expect(counter).toBe(0)
  })

  it('subscribe to one update when a specific condition is met', async () => {
    const store = ministore(0)
    const promise = store.once(m => m > 1)
    store.update(1)
    store.update(2)
    store.update(3)
    expect(await promise).toBe(2)
  })

  it('unsubscribe before the condition is met', async () => {
    let counter = 0
    const store = ministore(0)
    const promise = store.once(m => m > 1)
    promise.then(n => (counter += n))
    store.update(1)
    promise.cancel()
    store.update(2)
    store.update(3)
    await Promise.resolve()
    expect(counter).toBe(0)
  })
})

describe('compose', () => {
  it('computed state', () => {
    const storeA = ministore(1)
    const storeB = ministore(2)
    const store = ministore.compose((state1: number, state2: number) => 10 * state1 + state2, [storeA, storeB])

    expect(store.getState()).toBe(12)
  })

  it('computed state from different types', () => {
    const storeA = ministore('hello')
    const storeB = ministore(1)
    const store = ministore.compose((state1: string, state2: number) => state1 + state2, [storeA, storeB])

    expect(store.getState()).toBe('hello1')
  })

  it('composite store cannot be updated directly', () => {
    const storeA = ministore(1)
    const storeB = ministore(2)
    const composite = ministore.compose((state1: number, state2: number) => 10 * state1 + state2, [storeA, storeB])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((composite as any).update).toBeUndefined()
  })

  it('update', () => {
    const storeA = ministore(1)
    const storeB = ministore(2)
    const composite = ministore.compose((state1: number, state2: number) => 10 * state1 + state2, [storeA, storeB])

    storeA.update(2)
    expect(composite.getState()).toBe(22)

    storeB.update(3)
    expect(composite.getState()).toBe(23)
  })

  describe('subscribe', () => {
    it('subscribe to an update', () => {
      const storeA = ministore(1)
      const storeB = ministore(2)
      const composite = ministore.compose((state1: number, state2: number) => 10 * state1 + state2, [storeA, storeB])

      let value = 0
      composite.subscribe(n => (value = n))
      storeA.update(2)

      expect(value).toBe(22)
    })

    it('unsubscribe', () => {
      const storeA = ministore(1)
      const storeB = ministore(2)
      const composite = ministore.compose((state1: number, state2: number) => 10 * state1 + state2, [storeA, storeB])

      let counter = 0
      const unsubscribe = composite.subscribe(() => counter++)
      storeA.update(2)

      expect(counter).toBe(1)

      unsubscribe()
      storeA.update(3)
      expect(counter).toBe(1)
    })
  })

  it('destroy', () => {
    const storeA = ministore(1)
    const storeB = ministore(2)
    const composite = ministore.compose((state1: number, state2: number) => 10 * state1 + state2, [storeA, storeB])

    let counter = 0
    composite.subscribe(() => counter++)
    storeA.update(2)

    expect(counter).toBe(1)

    composite.destroy()
    storeA.update(3)
    expect(counter).toBe(1)
  })

  it('only trigger if computed state has changed', () => {
    const storeA = ministore(2)
    const storeB = ministore(3)
    const composite = ministore.compose(
      (state1: number, state2: number) => (state1 % 2) + (state2 % 3),
      [storeA, storeB],
    )

    let counter = 0
    composite.subscribe(() => counter++)

    storeA.update(3)
    expect(counter).toBe(1)

    storeA.update(5)
    expect(counter).toBe(1)
  })
})

describe('dispose', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // https://github.com/cybersemics/em/issues/5246
  it('release a timer held in state when the store is reset through the registry', () => {
    vi.useFakeTimers()
    const fired = vi.fn()
    const store = ministore<{ timeoutId: number | null }>(
      { timeoutId: null },
      { dispose: state => window.clearTimeout(state.timeoutId ?? undefined) },
    )
    store.update({ timeoutId: window.setTimeout(fired, 100) })

    resetStores()

    expect(store.getState().timeoutId).toBe(null)
    vi.advanceTimersByTime(100)
    expect(fired).toHaveBeenCalledTimes(0)
  })

  it('see the live state before it is restored', () => {
    const disposed: number[] = []
    const store = ministore(1, { dispose: state => disposed.push(state) })
    store.update(2)

    store.reset()

    expect(disposed).toEqual([2])
    expect(store.getState()).toBe(1)
  })

  it('run even when the state already equals the initial state', () => {
    const dispose = vi.fn()
    const store = ministore({ timeoutId: null }, { dispose })

    store.reset()

    expect(dispose).toHaveBeenCalledExactlyOnceWith({ timeoutId: null })
  })

  it('run through reactMinistore', () => {
    const dispose = vi.fn()
    const store = reactMinistore<number>(1, { dispose })
    store.update(2)

    resetStores()

    expect(dispose).toHaveBeenCalledExactlyOnceWith(2)
    expect(store.getState()).toBe(1)
  })
})
