import multitouchStore, { updateMultitouch } from '../multitouch'

/** Builds a minimal TouchEvent-like object with the given number of active touches. */
const touchEvent = (numTouches: number) => ({ touches: { length: numTouches } }) as TouchEvent

beforeEach(() => {
  updateMultitouch(touchEvent(0))
})

it('latches true while more than one finger is down and clears only when every finger lifts', () => {
  expect(multitouchStore.getState()).toBe(false)

  // a single finger does not latch
  updateMultitouch(touchEvent(1))
  expect(multitouchStore.getState()).toBe(false)

  // a second finger latches the store
  updateMultitouch(touchEvent(2))
  expect(multitouchStore.getState()).toBe(true)

  // one finger lifts, leaving one still down: the latch must persist so a drag cannot begin from the
  // remaining finger mid-gesture (the core of #4233)
  updateMultitouch(touchEvent(1))
  expect(multitouchStore.getState()).toBe(true)

  // all fingers lift: the latch clears
  updateMultitouch(touchEvent(0))
  expect(multitouchStore.getState()).toBe(false)
})
