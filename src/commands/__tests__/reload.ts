import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { keyDown } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'

/** The reload of the stubbed window.location. JSDOM does not implement navigation, so the test reads the reload from here. */
const reload = vi.fn()

beforeEach(() => {
  initStore()
  reload.mockClear()
  vi.stubGlobal('location', { ...window.location, reload })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('reloads the app on Command + R', () => {
  // A fresh state opens the welcome modal.
  store.dispatch(closeModal())

  keyDown(new KeyboardEvent('keydown', { key: 'r', metaKey: true }))

  expect(reload).toHaveBeenCalledOnce()
})

it('reloads the app on Command + R while a modal is open', () => {
  store.dispatch(showModal({ id: 'settings' }))

  keyDown(new KeyboardEvent('keydown', { key: 'r', metaKey: true }))

  expect(reload).toHaveBeenCalledOnce()
})
