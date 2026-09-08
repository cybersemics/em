import store from '../../stores/app'
import { updateMultitouch } from '../../stores/multitouchStore'
import initEvents from '../initEvents'

// The multi-touch suppression listeners are only registered on a touch device. They are tested in their own file
// because initEvents registers its listeners once per module registry, so isTouch must be mocked before the
// single registration. The non-touch behavior is covered in initEvents.ts.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(() => {
  initEvents(store)
  // reset the multitouch latch with a fresh single-finger touchstart
  updateMultitouch({ type: 'touchstart', touches: { length: 1 } } as TouchEvent)
})

// iOS Safari ignores the viewport user-scalable=no / maximum-scale=1 settings and still allows native
// pinch-to-zoom and two-finger page panning, which should be inert in the app. See #4233.
it('prevents native pinch-to-zoom gestures (iOS Safari)', () => {
  const gestureNames = ['gesturestart', 'gesturechange', 'gestureend']
  gestureNames.forEach(name => {
    const e = new Event(name, { cancelable: true })
    document.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })
})

// While the multitouch latch is set, touchmove is prevented so the native caret/text selection does not follow
// the fingers and the page does not scroll. See #4233.
it('blocks touchmove while two fingers are down, but not otherwise', () => {
  const single = Object.assign(new Event('touchmove', { cancelable: true }), { touches: { length: 1 } })
  window.dispatchEvent(single)
  expect(single.defaultPrevented).toBe(false)

  updateMultitouch({ type: 'touchstart', touches: { length: 2 } } as TouchEvent)

  const double = Object.assign(new Event('touchmove', { cancelable: true }), { touches: { length: 2 } })
  window.dispatchEvent(double)
  expect(double.defaultPrevented).toBe(true)
})

// Gestures of three or more fingers belong to the OS — notably the iOS three-finger swipe that drives undo and
// redo — so their default is not suppressed even though the multitouch latch is set. See #4233.
it('does not block touchmove for three or more fingers', () => {
  updateMultitouch({ type: 'touchstart', touches: { length: 3 } } as TouchEvent)

  const triple = Object.assign(new Event('touchmove', { cancelable: true }), { touches: { length: 3 } })
  window.dispatchEvent(triple)
  expect(triple.defaultPrevented).toBe(false)
})
