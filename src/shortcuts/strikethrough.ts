import Shortcut from '../@types/Shortcut'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/StrikethroughIcon'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as strikethrough. If there is no selection, formats the entire thought. */
const strikethrough: Shortcut = {
  id: 'strikethrough',
  label: 'Strikethrough',
  description: 'Formats a thought or selected text with strikethrough.',
  descriptionInverse: 'Removes strikethrough formatting from the current thought or selected text.',
  svg: Icon,
  keyboard: { key: 's', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState, e) => {
    e.preventDefault()
    dispatch(formatSelection('strikethrough'))
  },
  isActive: getState => {
    const state = getState()
    if (!state.cursor) return false
    const thought = getThoughtById(state, head(state.cursor))
    return thought.value.includes('<strike>')
  },
}

export default strikethrough
