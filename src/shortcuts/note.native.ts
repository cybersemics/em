import { attribute, simplifyPath } from '../selectors'

import PencilIcon from '../components/icons/PencilIcon'
import { pathToContext } from '../util'
import { toggleNote } from '../action-creators'
import { Shortcut } from '../@types'
import { HOME_PATH } from '../constants'

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
    const context = pathToContext(state, cursor ? simplifyPath(state, cursor) : HOME_PATH)
    return attribute(state, context, '=note') != null
  },
}

export default noteShortcut
