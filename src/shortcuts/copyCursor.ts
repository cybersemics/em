import ClipboardJS from 'clipboard'
import { editableNode, exportPhrase, hashContext, isDocumentEditable, pathToContext, setSelection } from '../util'
import { exportContext, getDescendants, isPending, simplifyPath } from '../selectors'
import { alert, pull } from '../action-creators'
import { Shortcut, SimplePath, State } from '../@types'

/** Copies a string directly to the clipboard by simulating a button click with ClipboadJS. */
const copy = (s: string): void => {
  const dummyButton = document.createElement('button')
  const clipboard = new ClipboardJS(dummyButton, { text: () => s })
  dummyButton.click()
  clipboard.destroy()
}

/** Returns true if any descendants of the given Path is pending. Stops traversing when any pending descendant is found. */
const hasPending = (state: State, simplePath: SimplePath) => {
  let isPendingFound = false
  // ignore the return value of getDescendants
  // we are just using its filterFunction to check pending
  getDescendants(state, simplePath, {
    filterFunction: (child, context) => {
      const contextChild = [...context, child.value]
      if (isPending(state, contextChild)) {
        isPendingFound = true
      }
      // if pending has been found, return false to filter out all remaining children and short circuit
      return !isPendingFound
    },
  })

  return isPendingFound
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
    if (hasPending(state, simplePath)) {
      dispatch(alert('Loading thoughts...', { alertType: 'clipboard' }))
      await dispatch(pull({ [hashContext(context)]: context }, { maxDepth: Infinity }))
    }

    const exported = exportContext(state, context, 'text/plain')
    copy(exported)

    // restore selection
    const el = editableNode(cursor!)
    setSelection(el!, { offset })

    const numDescendants = exported ? exported.split('\n').length - 1 : 0
    const phrase = exportPhrase(state, context, numDescendants)

    dispatch(
      alert(`Copied ${phrase} to the clipboard`, {
        alertType: 'clipboard',
        clearTimeout: 3000,
      }),
    )
  },
}

export default copyCursorShortcut
