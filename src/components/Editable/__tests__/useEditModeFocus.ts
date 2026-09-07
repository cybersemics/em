import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../actions/keyboardOpen'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
import useEditMode from '../useEditMode'

// The asyncFocus dance that strands the focus is only performed on Mobile Safari.
vi.mock('../../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../browser')>()
  return { ...actual, isTouch: true, isSafari: () => true }
})

beforeEach(initStore)

// https://github.com/cybersemics/em/pull/4692
it('focuses the editable when the caret is placed with no prior selection on a thought', () => {
  store.dispatch([importText({ text: '- Hello World' }), setCursor(['Hello World']), keyboardOpen({ value: true })])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.setAttribute('data-editable', '')
  document.body.appendChild(editable)

  // Nothing is selected, as after an undo whose cursor change ran the clearSelection middleware. useEditMode calls
  // asyncFocus in this case, which parks the focus on a dummy input.
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

  // The editable must end up with the focus. If it is left on the dummy input, WKWebView never raises the keyboard
  // for the editable and no caret renders.
  expect(document.activeElement).toBe(editable)
})
