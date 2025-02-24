import _ from 'lodash'
import ministore from '../../stores/ministore'

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
