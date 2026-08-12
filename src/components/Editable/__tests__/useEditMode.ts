import { renderHook } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { executeCommandWithMulticursor } from '../../../commands'
import clearThoughtCommand from '../../../commands/clearThought'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
import useEditMode from '../useEditMode'

/** Captures the native keyboard plugin calls made by the app. */
const keyboardShow = vi.hoisted(() => vi.fn())

// Emulate the Android Capacitor app, where the WebView does not raise the native keyboard when an editable is
// focused programmatically.
vi.mock('@capacitor/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      getPlatform: () => 'android',
      isNativePlatform: () => true,
      isPluginAvailable: () => true,
    },
  }
})

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: () => Promise.resolve({ remove: () => {} }),
    hide: () => Promise.resolve(),
    removeAllListeners: () => Promise.resolve(),
    show: keyboardShow,
  },
}))

beforeEach(initStore)

// https://github.com/cybersemics/em/issues/4686
it('opens the virtual keyboard when Clear Thought activates edit mode', async () => {
  store.dispatch([importText({ text: '- Hello World' }), setCursor(['Hello World'])])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)

  renderHook(
    () =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing: true,
        path: store.getState().cursor!,
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

  // the cursor is on the thought with the keyboard closed
  expect(store.getState().isKeyboardOpen).toBeFalsy()
  expect(keyboardShow).not.toHaveBeenCalled()

  await act(async () => {
    executeCommandWithMulticursor(clearThoughtCommand, { store })
  })

  expect(keyboardShow).toHaveBeenCalled()
})
