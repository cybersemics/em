import Command from '../@types/Command'
import FormattingCommand from '../@types/FormattingCommand'
import { formatWithTagActionCreator as formatWithTag } from '../actions/formatWithTag'
import Icon from '../components/icons/ItalicTextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import { scrollMulticursorIntoViewOnComplete } from '../stores/scrollMulticursorIntoView'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as italic. If there is no selection, formats the entire thought. */
const italic: Command = {
  id: 'italic',
  label: 'Italic',
  description: 'Italicizes the current thought or selected text.',
  descriptionInverse: 'Removes italics from the current thought or selected text. So much for being special.',
  svg: Icon,
  keyboard: { key: 'i', meta: true },
  multicursor: { onComplete: scrollMulticursorIntoViewOnComplete },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatWithTag(FormattingCommand.italic))
  },
  // The isActive logic for formatting commands is handled differently than other commands because it references the CommandStateStore. This can be found in ToolbarButton (isButtonActive)
}

export default italic
