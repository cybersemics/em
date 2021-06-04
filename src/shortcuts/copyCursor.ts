import ClipboardJS from 'clipboard'
import { editableNode, getExportPhrase, isDocumentEditable, pathToContext, setSelection } from '../util'
import { exportContext, simplifyPath } from '../selectors'
import { alert } from '../action-creators'
import { Shortcut } from '../types'

/** Copies a string directly to the clipboard by simulating a button click with ClipboadJS. */
const copy = (s: string): void => {
  const dummyButton = document.createElement('button')
  const clipboard = new ClipboardJS(dummyButton, { text: () => s })
  dummyButton.click()
  clipboard.destroy()
}

const copyCursorShortcut: Shortcut = {
  id: 'copyCursor',
  name: 'Copy Cursor',
  description: 'Copies the cursor and all descendants.',
  keyboard: { key: 'c', meta: true },
  canExecute: getState =>
    // do not copy cursor if there is a browser selection
    !window.getSelection()?.toString() &&
    !!getState().cursor &&
    isDocumentEditable(),
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    const simplePath = simplifyPath(state, cursor!)
    const context = pathToContext(simplePath)
    const exported = exportContext(state, context, 'text/plain')
    const offset = window.getSelection()?.focusOffset
    copy(exported)

    // restore selection
    const el = editableNode(cursor!)
    setSelection(el!, { offset })

    dispatch(alert(`Copied ${getExportPhrase(state, simplePath)} to the clipboard`, { alertType: 'clipboard', clearTimeout: 3000 }))
  }
}

export default copyCursorShortcut
