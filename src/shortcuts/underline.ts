import Shortcut from '../@types/Shortcut'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/UnderlineIcon'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as underline. If there is no selection, formats the entire thought. */
const underline: Shortcut = {
  id: 'underline',
  label: 'Underline',
  description: 'Underlines a thought or selected text.',
  descriptionInverse: 'Removes the underline from the current thought.',
  svg: Icon,
  keyboard: { key: 'u', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => {
    dispatch(formatSelection('underline'))
  },
  isActive: (getState, getCommandState) => {
    const commandState = getCommandState()
    return commandState.underline === true
  },
}

export default underline
