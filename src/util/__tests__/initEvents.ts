import { errorActionCreator as error } from '../../actions/error'
import store from '../../stores/app'
// Importing initEvents registers the global window 'error' listener as a side effect.
import '../initEvents'

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
