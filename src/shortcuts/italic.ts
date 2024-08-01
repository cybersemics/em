import Shortcut from '../@types/Shortcut'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/ItalicTextIcon'
import getThoughtById from '../selectors/getThoughtById'
import commandStateStore from '../stores/commandStateStore'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as italic. If there is no selection, formats the entire thought. */
const italic: Shortcut = {
  id: 'italic',
  label: 'Italic',
  description: 'Italicizes a thought or selected text.',
  descriptionInverse: 'Removes italic formatting from the current thought.',
  svg: Icon,
  keyboard: { key: 'i', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => {
    dispatch(formatSelection('italic'))
  },
  isActive: () => {
    return false
  },
}

export default italic
