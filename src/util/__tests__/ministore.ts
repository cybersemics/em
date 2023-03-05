import _ from 'lodash'
import ministore from '../../stores/ministore'
import { delay } from '../../test-helpers/delay'

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

it('subscribe', async () => {
  let counter = 0
  const store = ministore(0)
  store.subscribe(n => (counter += n))
  store.update(1)
  await delay(0)
  expect(counter).toBe(1)
})

it('subscribe: only trigger if state has changed', async () => {
  let counter = 0
  const store = ministore(0)
  store.subscribe(n => counter++)
  store.update(1)
  store.update(1)
  await delay(0)
  expect(counter).toBe(1)
})

it('subscribeSelector', async () => {
  let counter = 0
  const store = ministore({ a: 1, b: 4 })
  store.subscribeSelector(
    state => state.a,
    a => (counter += a),
  )
  store.update({ a: 2 })
  await delay(0)
  expect(counter).toBe(2)
})

it('subscribeSelector: only trigger if slice has changed', async () => {
  let counter = 0
  const store = ministore({ a: 1, b: 4 })
  store.subscribeSelector(
    state => state.a,
    a => counter++,
  )
  store.update({ a: 2 })
  store.update({ a: 2, b: 5 })
  await delay(0)
  expect(counter).toBe(1)
})

it('subscribeSelector: custom equals function', async () => {
  let counter = 0
  const store = ministore({ a: 1, b: 4 })
  store.subscribeSelector(
    state => ({ x: state.a }),
    a => counter++,
    _.isEqual,
  )
  store.update({ a: 2 })
  store.update({ a: 2, b: 5 })
  await delay(0)
  expect(counter).toBe(1)
})
