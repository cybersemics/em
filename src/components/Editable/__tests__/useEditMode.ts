import { renderHook } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { deleteEmptyThoughtActionCreator as deleteEmptyThought } from '../../../actions/deleteEmptyThought'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../actions/keyboardOpen'
import { newThoughtActionCreator as newThought } from '../../../actions/newThought'
import { executeCommandWithMulticursor } from '../../../commands'
import clearThoughtCommand from '../../../commands/clearThought'
import * as selection from '../../../device/selection'
import contextToPath from '../../../selectors/contextToPath'
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

// JSDOM has no layout, so the caret offset of a click cannot be computed from its coordinates. Place it at the end of
// the clicked thought, "first", as a click at its right edge would.
vi.mock('../../../device/getCaretOffset', () => ({ default: () => ({ offset: 'first'.length, inVoidArea: false }) }))

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

// https://github.com/cybersemics/em/issues/6258
it.skip('places the caret when the cursor returns to a clicked thought before the next timer fires', async () => {
  store.dispatch([importText({ text: '- first\n- last' }), setCursor(['last']), keyboardOpen({ value: true })])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.setAttribute('data-editable', '')
  editable.textContent = 'first'
  document.body.appendChild(editable)

  const path = contextToPath(store.getState(), ['first'])!

  const { rerender } = renderHook(
    ({ isEditing }: { isEditing: boolean }) =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing,
        path,
        style: undefined,
        transient: undefined,
      }),
    {
      initialProps: { isEditing: false },
      wrapper: ({ children }) => createElement(Provider, { store, children }),
    },
  )

  // click on the end of "first", which places the caret itself and moves the cursor there
  await act(async () => {
    editable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  })
  rerender({ isEditing: true })

  // Enter creates an empty thought after "first", and the caret moves to it.
  // Timers are fake, so the timers queued by the click have not fired, as when the browser runs input and rendering
  // tasks ahead of them.
  await act(async () => {
    store.dispatch(newThought({ value: '' }))
  })
  rerender({ isEditing: false })
  selection.clear()

  // Backspace deletes the empty thought and moves the cursor back to the end of "first"
  await act(async () => {
    store.dispatch(deleteEmptyThought)
  })
  expect(store.getState().cursor).toEqual(path)
  rerender({ isEditing: true })

  // offset at the end of the thought is value.length for TEXT_NODE and 1 for ELEMENT_NODE
  const sel = window.getSelection()!
  expect(editable.contains(sel.focusNode)).toBe(true)
  expect(sel.focusOffset).toBe(sel.focusNode?.nodeType === Node.TEXT_NODE ? 'first'.length : 1)
})
