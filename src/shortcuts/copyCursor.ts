import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import { pullActionCreator as pull } from '../actions/pull'
import SettingsIcon from '../components/icons/SettingsIcon'
import { AlertType } from '../constants'
import copy from '../device/copy'
import * as selection from '../device/selection'
import exportContext from '../selectors/exportContext'
import getThoughtById from '../selectors/getThoughtById'
import isPending from '../selectors/isPending'
import simplifyPath from '../selectors/simplifyPath'
import someDescendants from '../selectors/someDescendants'
import exportPhrase from '../util/exportPhrase'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const copyCursorShortcut: Shortcut = {
  id: 'copyCursor',
  label: 'Copy Cursor',
  description: 'Copies the cursor and all descendants.',
  keyboard: { key: 'c', meta: true },
  hideFromHelp: true,
  multicursor: {
    enabled: true,
    execMulticursor: (cursors, dispatch, getState) => {
      // TODO: Implement
    },
  },
  // TODO: Create unique icon
  svg: SettingsIcon,
  canExecute: getState =>
    // do not copy cursor if there is a browser selection
    selection.isCollapsed() && !!getState().cursor && isDocumentEditable(),
  exec: async (dispatch, getState) => {
    const state = getState()
    const simplePath = simplifyPath(state, state.cursor!)

    // if there are any pending descendants, do a pull
    // otherwise copy whatever is in state
    if (someDescendants(state, head(simplePath), child => isPending(state, getThoughtById(state, child.id)))) {
      dispatch(alert('Loading thoughts...', { alertType: AlertType.Clipboard }))
      await dispatch(pull([head(simplePath)], { maxDepth: Infinity }))
    }

    // get new state after pull
    const stateAfterPull = getState()

    const exported = exportContext(stateAfterPull, head(simplePath), 'text/plain')
    copy(exported)

    const numDescendants = exported ? exported.split('\n').length - 1 : 0
    const phrase = exportPhrase(head(simplePath), numDescendants, {
      value: getThoughtById(stateAfterPull, head(simplePath))?.value,
    })

    dispatch(
      alert(`Copied ${phrase} to the clipboard`, {
        alertType: AlertType.Clipboard,
        clearDelay: 3000,
      }),
    )
  },
}

export default copyCursorShortcut
