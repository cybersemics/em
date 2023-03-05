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

it('subscribe to update', async () => {
  let counter = 0
  const store = ministore(0)
  store.subscribe(n => (counter += n))
  store.update(1)
  // wait for next tick since ministore updates are asynchronous
  await delay(0)
  expect(counter).toBe(1)
})
