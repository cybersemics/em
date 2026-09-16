import { act } from 'react'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

// MultiGesture is only mounted on touch devices.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(async () => {
  // jsdom does not implement elementFromPoint, which shouldCancelGesture calls to detect a touch on a range input.
  document.elementFromPoint = () => null
  await createTestApp()
})
afterEach(cleanupTestApp)

/** Starts a touch at the given viewport coordinates and returns true if the browser's default behavior was cancelled. */
const touchStart = (x: number, y: number): boolean => {
  const e = new TouchEvent('touchstart', { bubbles: true, cancelable: true })
  // jsdom does not implement the Touch constructor, so the touch lists cannot be passed to TouchEvent.
  const touch = { identifier: 0, target: document.body, clientX: x, clientY: y, pageX: x, pageY: y }
  Object.defineProperties(e, {
    touches: { value: [touch] },
    targetTouches: { value: [touch] },
    changedTouches: { value: [touch] },
  })
  act(() => {
    document.body.dispatchEvent(e)
  })
  return e.defaultPrevented
}

// https://github.com/cybersemics/em/issues/4115
it('cancels a touch that starts at the edge of the screen', () => {
  // Mobile Safari recognizes its back/forward navigation swipe from a touch that starts within a narrow strip at the
  // edge of the screen, and abandons it only when the touchstart is cancelled. Otherwise the previous page slides in
  // under the finger while em reads the same swipe as a gesture, showing a second, stale gesture menu.
  expect(touchStart(2, 300)).toBe(true)
})

it('does not cancel a touch that starts away from the edge of the screen', () => {
  // Cancelling an ordinary touch would stop the browser from focusing the thought that was tapped.
  expect(touchStart(400, 300)).toBe(false)
})
