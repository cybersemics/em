import _ from 'lodash'
import ministore from '../../stores/ministore'
import sleep from '../../util/sleep'

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
  it('subscribe to an update', async () => {
    let counter = 0
    const store = ministore(0)
    store.subscribe(n => (counter += n))
    store.update(1)
    await sleep(0)
    expect(counter).toBe(1)
  })

  it('unsubscribe', async () => {
    let counter = 0
    const store = ministore(0)
    const unsubscribe = store.subscribe(n => (counter += n))
    store.update(1)
    await sleep(0)
    expect(counter).toBe(1)

    unsubscribe()
    store.update(2)
    await sleep(0)
    expect(counter).toBe(1)
  })

  it('only trigger if state has changed', async () => {
    let counter = 0
    const store = ministore(0)
    store.subscribe(n => counter++)
    store.update(1)
    store.update(1)
    await sleep(0)
    expect(counter).toBe(1)
  })
})

describe('subscribeSelector', () => {
  it('subscribe to a slice of state', async () => {
    let counter = 0
    const store = ministore({ a: 1, b: 4 })
    store.subscribeSelector(
      state => state.a,
      a => (counter += a),
    )
    store.update({ a: 2 })
    await sleep(0)
    expect(counter).toBe(2)
  })

  it('only trigger if slice has changed', async () => {
    let counter = 0
    const store = ministore({ a: 1, b: 4 })
    store.subscribeSelector(
      state => state.a,
      a => counter++,
    )
    store.update({ a: 2 })
    store.update({ a: 2, b: 5 })
    await sleep(0)
    expect(counter).toBe(1)
  })

  it('custom equals function', async () => {
    let counter = 0
    const store = ministore({ a: 1, b: 4 })
    store.subscribeSelector(
      state => ({ x: state.a }),
      a => counter++,
      _.isEqual,
    )
    store.update({ a: 2 })
    store.update({ a: 2, b: 5 })
    await sleep(0)
    expect(counter).toBe(1)
  })
})

describe('once', () => {
  it('subscribe one update', async () => {
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
    await sleep(0)
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
    await sleep(0)
    expect(counter).toBe(0)
  })
})
