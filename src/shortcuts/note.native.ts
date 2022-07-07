import Shortcut from '../@types/Shortcut'
import toggleNote from '../action-creators/toggleNote'
import PencilIcon from '../components/icons/PencilIcon'
import { HOME_PATH } from '../constants'
import attribute from '../selectors/attribute'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'

const noteShortcut: Shortcut = {
  id: 'note',
  label: 'Note',
  description: 'Add a small note beneath a thought.',
  svg: PencilIcon,

  // canExecute: () => isDocumentEditable(),
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state

    // check cursor in exec rather than short-circuiting in canExecute so that the default browser behavior is always prevented
    if (!cursor) return

    dispatch(toggleNote())
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return attribute(state, head(path), '=note') != null
  },
}

export default noteShortcut
