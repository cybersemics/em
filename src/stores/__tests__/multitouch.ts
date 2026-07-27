import multitouchStore, { updateMultitouch } from '../multitouch'

/** Builds a minimal TouchEvent-like object with the given number of active touches and event type. */
const touchEvent = (numTouches: number, type: 'touchstart' | 'touchend' | 'touchcancel' = 'touchstart') =>
  ({ type, touches: { length: numTouches } }) as TouchEvent

beforeEach(() => {
  // reset via a fresh single-finger touchstart
  updateMultitouch(touchEvent(1, 'touchstart'))
  updateMultitouch(touchEvent(0, 'touchend'))
})

it('latches true on a second finger and persists through touchend until a fresh interaction begins', () => {
  // a fresh single-finger interaction resets the latch
  updateMultitouch(touchEvent(1, 'touchstart'))
  expect(multitouchStore.getState()).toBe(false)

  // a second finger latches the store
  updateMultitouch(touchEvent(2, 'touchstart'))
  expect(multitouchStore.getState()).toBe(true)

  // one finger lifts, leaving one still down: the latch must persist so a drag cannot begin from the
  // remaining finger mid-gesture (the core of #4233)
  updateMultitouch(touchEvent(1, 'touchend'))
  expect(multitouchStore.getState()).toBe(true)

  // the last finger lifts: the latch is NOT cleared, so the terminating tap/click still reads it and does
  // not move the cursor or fire a gesture
  updateMultitouch(touchEvent(0, 'touchend'))
  expect(multitouchStore.getState()).toBe(true)

  // the first finger of a brand-new interaction resets the latch
  updateMultitouch(touchEvent(1, 'touchstart'))
  expect(multitouchStore.getState()).toBe(false)
})

it('does not latch for a single-finger interaction', () => {
  updateMultitouch(touchEvent(1, 'touchstart'))
  expect(multitouchStore.getState()).toBe(false)
  updateMultitouch(touchEvent(0, 'touchend'))
  expect(multitouchStore.getState()).toBe(false)
})
