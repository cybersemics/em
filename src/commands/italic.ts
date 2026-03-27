import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/ItalicTextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as italic. If there is no selection, formats the entire thought. */
const italic: Command = {
  id: 'italic',
  label: 'Italic',
  description: 'Italicizes the current thought or selected text.',
  descriptionInverse: 'Removes italics from the current thought or selected text. So much for being special.',
  svg: Icon,
  keyboard: { key: 'i', meta: true },
  multicursor: true,
  canExecute: state => {
    return isDocumentEditable() && !state.noteFocus && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('italic'))
  },
  // The isActive logic for formatting commands is handled differently than other commands because it references the CommandStateStore. This can be found in ToolbarButton (isButtonActive)
}

export default italic
