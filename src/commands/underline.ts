import Command from '../@types/Command'
import FormattingCommand from '../@types/FormattingCommand'
import { formatWithTagActionCreator as formatWithTag } from '../actions/formatWithTag'
import Icon from '../components/icons/UnderlineIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import { scrollMulticursorIntoViewOnComplete } from '../stores/scrollMulticursorIntoView'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as underline. If there is no selection, formats the entire thought. */
const underline: Command = {
  id: 'underline',
  label: 'Underline',
  description: 'Underlines the current thought or selected text.',
  descriptionInverse: 'Removes the underline from the current thought or selected text.',
  svg: Icon,
  keyboard: { key: 'u', meta: true },
  multicursor: {
    preventSetCursor: true,
    onComplete: scrollMulticursorIntoViewOnComplete,
  },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatWithTag(FormattingCommand.underline))
  },
  // The isActive logic for formatting commands is handled differently than other commands because it references the CommandStateStore. This can be found in ToolbarButton (isButtonActive)
}

export default underline
