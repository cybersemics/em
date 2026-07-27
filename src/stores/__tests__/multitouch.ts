import multitouchStore, { updateActiveTouches } from '../multitouch'

/** Builds a minimal TouchEvent-like object with the given number of active touches. */
const touchEvent = (numTouches: number) => ({ touches: { length: numTouches } }) as TouchEvent

beforeEach(() => {
  updateActiveTouches(touchEvent(0))
})

it('tracks the number of active touch points', () => {
  expect(multitouchStore.getState()).toBe(0)

  updateActiveTouches(touchEvent(1))
  expect(multitouchStore.getState()).toBe(1)

  updateActiveTouches(touchEvent(2))
  expect(multitouchStore.getState()).toBe(2)

  // a finger lifts, leaving one touch
  updateActiveTouches(touchEvent(1))
  expect(multitouchStore.getState()).toBe(1)

  // all fingers lift
  updateActiveTouches(touchEvent(0))
  expect(multitouchStore.getState()).toBe(0)
})
