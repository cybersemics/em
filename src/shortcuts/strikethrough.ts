import Shortcut from '../@types/Shortcut'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/StrikethroughIcon'
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
  isActive: (getState, getCommandState) => {
    const commandState = getCommandState()
    return commandState.strikethrough === true
  },
}

export default strikethrough
