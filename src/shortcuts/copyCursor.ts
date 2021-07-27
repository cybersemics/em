import ClipboardJS from 'clipboard'
import { editableNode, exportPhrase, hashContext, isDocumentEditable, pathToContext, setSelection } from '../util'
import { exportContext, getDescendants, isPending, simplifyPath } from '../selectors'
import { alert, pull } from '../action-creators'
import { Shortcut } from '../@types'

/** Copies a string directly to the clipboard by simulating a button click with ClipboadJS. */
const copy = (s: string): void => {
  const dummyButton = document.createElement('button')
  const clipboard = new ClipboardJS(dummyButton, { text: () => s })
  dummyButton.click()
  clipboard.destroy()
}

const copyCursorShortcut: Shortcut = {
  id: 'copyCursor',
  label: 'Copy Cursor',
  description: 'Copies the cursor and all descendants.',
  keyboard: { key: 'c', meta: true },
  canExecute: getState =>
    // do not copy cursor if there is a browser selection
    !window.getSelection()?.toString() && !!getState().cursor && isDocumentEditable(),
  exec: async (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    const simplePath = simplifyPath(state, cursor!)
    const context = pathToContext(simplePath)
    const offset = window.getSelection()?.focusOffset

    // if there are any pending descendants, do a pull
    // otherwise copy whatever is in state
    let hasPending = false
    getDescendants(state, simplePath, {
      // use filterFunction just to check if any child is pending
      filterFunction: (child, context) => {
        if (isPending(state, [...context, child.value])) hasPending = true
        return true
      },
    })
    if (hasPending) {
      dispatch(alert('Loading thoughts...', { alertType: 'clipboard' }))
      await dispatch(pull({ [hashContext(context)]: context }, { maxDepth: Infinity }))
    }

    const exported = exportContext(state, context, 'text/plain')
    copy(exported)

    // restore selection
    const el = editableNode(cursor!)
    setSelection(el!, { offset })

    const phrase = exportPhrase(state, context, exported)

    dispatch(
      alert(`Copied ${phrase} to the clipboard`, {
        alertType: 'clipboard',
        clearTimeout: 3000,
      }),
    )
  },
}

export default copyCursorShortcut
