import { errorActionCreator as error } from '../../actions/error'
import store from '../../stores/app'
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

// iOS Safari ignores user-scalable=no/maximum-scale=1, so pinch-to-zoom is natively enabled. Over the
// scroll zone (where touchmove is intentionally not prevented) a two-finger pinch zooms the app. Pinch
// fires the WebKit-specific gesturestart/gesturechange events; preventing their default disables the zoom.
// See https://github.com/cybersemics/em/issues/4724.
it.each(['gesturestart', 'gesturechange'])('prevents pinch-to-zoom by preventing default on %s', type => {
  initEvents(store)
  const e = new Event(type, { cancelable: true, bubbles: true })
  document.dispatchEvent(e)
  expect(e.defaultPrevented).toBe(true)
})
