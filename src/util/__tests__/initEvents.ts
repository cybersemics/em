import { errorActionCreator as error } from '../../actions/error'
import store from '../../stores/app'
import { updateMultitouch } from '../../stores/multitouch'
// Importing initEvents registers the global window 'error' listener as a side effect.
import initEvents from '../initEvents'

beforeEach(() => {
  store.dispatch(error({ value: null }))
})

it('shows an error banner for genuine errors with an error object', () => {
  window.dispatchEvent(new ErrorEvent('error', { message: 'Real error', error: new Error('Real error') }))
  expect(store.getState().error).toBe('Real error')
})

// Opaque cross-origin "Script error." events carry no actionable information and should not be surfaced to
// the user. iOS Safari emits one when interacting with the browser's native share menu.
// See https://github.com/cybersemics/em/issues/4402.
it('ignores opaque cross-origin "Script error." events', () => {
  window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.', error: null, filename: '', lineno: 0 }))
  expect(store.getState().error).toBe(null)
})

// iOS Safari ignores the viewport user-scalable=no / maximum-scale=1 settings and still allows native
// pinch-to-zoom and two-finger page panning, which should be inert in the app. initEvents prevents this
// by calling preventDefault on the Safari-only gesturestart/gesturechange/gestureend events. See #4233.
it('prevents native pinch-to-zoom gestures (iOS Safari)', () => {
  initEvents(store)

  const gestureNames = ['gesturestart', 'gesturechange', 'gestureend']
  gestureNames.forEach(name => {
    const e = new Event(name, { cancelable: true })
    document.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })
})

// A non-passive (blocking) touchmove listener on window marks the entire viewport as a blocking touch-handler
// region, which changes Chrome's compositing and shifts the subpixel anti-aliasing of composited elements
// (it broke the render-thoughts image snapshots). It suppresses the native caret/selection during a
// multi-touch gesture, which can only occur on a touch device, so it must not be registered otherwise.
// See #4233.
it('does not block touchmove on a non-touch device', () => {
  initEvents(store)

  // latch multitouch, which is the only condition under which touchmove is blocked
  updateMultitouch({ type: 'touchstart', touches: { length: 2 } } as TouchEvent)

  const e = new Event('touchmove', { cancelable: true })
  window.dispatchEvent(e)
  expect(e.defaultPrevented).toBe(false)

  // reset the latch with a fresh single-finger touchstart
  updateMultitouch({ type: 'touchstart', touches: { length: 1 } } as TouchEvent)
})
