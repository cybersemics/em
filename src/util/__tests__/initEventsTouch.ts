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
it('blocks touchmove while multitouch is latched, but not otherwise', () => {
  const single = new Event('touchmove', { cancelable: true })
  window.dispatchEvent(single)
  expect(single.defaultPrevented).toBe(false)

  updateMultitouch({ type: 'touchstart', touches: { length: 2 } } as TouchEvent)

  const multi = new Event('touchmove', { cancelable: true })
  window.dispatchEvent(multi)
  expect(multi.defaultPrevented).toBe(true)
})
