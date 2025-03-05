import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/BoldTextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as clear. If there is no selection, formats the entire thought. */
const removeFormat: Command = {
  id: 'removeFormat',
  label: 'removeFormat',
  description: 'Clear formatting the current thought or selected text.',
  descriptionInverse: 'Remove all formatting from the current thought or selected text.',
  multicursor: true,
  svg: Icon,
  keyboard: { key: '0', meta: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('removeFormat'))
  },
  // The isActive logic for formatting commands is handled differently than other commands because it references the CommandStateStore
}

export default removeFormat
