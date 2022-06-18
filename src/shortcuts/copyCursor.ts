import exportPhrase from '../util/exportPhrase'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import pathToContext from '../util/pathToContext'
import exportContext from '../selectors/exportContext'
import getThoughtById from '../selectors/getThoughtById'
import someDescendants from '../selectors/someDescendants'
import isPending from '../selectors/isPending'
import simplifyPath from '../selectors/simplifyPath'
import alert from '../action-creators/alert'
import pull from '../action-creators/pull'
import copy from '../device/copy'
import * as selection from '../device/selection'
import Shortcut from '../@types/Shortcut'

const copyCursorShortcut: Shortcut = {
  id: 'copyCursor',
  label: 'Copy Cursor',
  description: 'Copies the cursor and all descendants.',
  keyboard: { key: 'c', meta: true },
  canExecute: getState =>
    // do not copy cursor if there is a browser selection
    selection.isCollapsed() && !!getState().cursor && isDocumentEditable(),
  exec: async (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    const simplePath = simplifyPath(state, cursor!)
    const context = pathToContext(state, simplePath)

    // if there are any pending descendants, do a pull
    // otherwise copy whatever is in state
    if (someDescendants(state, head(simplePath), child => isPending(state, getThoughtById(state, child.id)))) {
      dispatch(alert('Loading thoughts...', { alertType: 'clipboard' }))
      await dispatch(pull([head(simplePath)], { maxDepth: Infinity }))
    }

    // get new state after pull
    const stateAfterPull = getState()

    const exported = exportContext(stateAfterPull, head(simplePath), 'text/plain')
    copy(exported)

    const numDescendants = exported ? exported.split('\n').length - 1 : 0
    const phrase = exportPhrase(stateAfterPull, context, numDescendants)

    dispatch(
      alert(`Copied ${phrase} to the clipboard`, {
        alertType: 'clipboard',
        clearDelay: 3000,
      }),
    )
  },
}

export default copyCursorShortcut
