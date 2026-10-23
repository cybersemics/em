import { act } from 'react'
import showTouchesStore from '../../stores/showTouchesStore'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatchTouchEvent from '../../test-helpers/dispatchTouchEvent'
import storage from '../../util/storage'

// Which touches are drawn, and where, is covered by src/util/__tests__/trackPrimaryTouch.ts.

/** Turns Show Touches on or off on this device. */
const setShowTouches = (value: boolean) => act(() => showTouchesStore.update({ enabled: value }))

/** Returns the Show Touches canvas, or null while the setting is off. */
const canvas = () => document.querySelector('[data-testid="show-touches"]')

const finger = { identifier: 0, clientX: 10, clientY: 20 }

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('draws nothing while the setting is off', () => {
  dispatchTouchEvent('touchstart', [finger])

  expect(canvas()).toBeNull()
})

it('draws over the app while the setting is on, and remembers it on this device only', async () => {
  await setShowTouches(true)

  expect(canvas()).not.toBeNull()
  expect(storage.getItem('showTouches')).toBe('true')

  await setShowTouches(false)

  expect(canvas()).toBeNull()
  expect(storage.getItem('showTouches')).toBeNull()
})

it('fades touches by default, and remembers Auto Fade turned off on this device only', async () => {
  expect(showTouchesStore.getState().autoFade).toBe(true)
  expect(storage.getItem('showTouchesAutoFade')).toBeNull()

  await act(() => showTouchesStore.update({ autoFade: false }))
  expect(storage.getItem('showTouchesAutoFade')).toBe('false')

  await act(() => showTouchesStore.update({ autoFade: true }))
  expect(storage.getItem('showTouchesAutoFade')).toBeNull()
})

it('does not prevent or stop the touch events it draws', async () => {
  await setShowTouches(true)
  const received: string[] = []
  /** Records each touch event that reaches the body. */
  const record = (e: Event) => received.push(e.type)
  const types = ['touchstart', 'touchmove', 'touchend'] as const
  types.forEach(type => document.body.addEventListener(type, record))

  const events = [
    dispatchTouchEvent('touchstart', [finger]),
    dispatchTouchEvent('touchmove', [{ ...finger, clientX: 30 }]),
    dispatchTouchEvent('touchend', [finger], { touches: [] }),
  ]
  types.forEach(type => document.body.removeEventListener(type, record))

  expect(received).toEqual(['touchstart', 'touchmove', 'touchend'])
  expect(events.map(e => e.defaultPrevented)).toEqual([false, false, false])
})
