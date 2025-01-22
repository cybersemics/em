import Command from '../@types/Command'
import FormattingCommand from '../@types/FormattingCommand'
import { formatWithTagActionCreator as formatWithTag } from '../actions/formatWithTag'
import Icon from '../components/icons/CodeIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as code. If there is no selection, formats the entire thought. */
const codeShortcut: Command = {
  id: 'code',
  label: 'Code',
  description: 'Formats the current thought or selected text as code.',
  descriptionInverse: 'Removes code formatting from the current thought or selected text.',
  multicursor: true,
  svg: Icon,
  keyboard: { key: 'k', meta: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatWithTag(FormattingCommand.code))
  },
  // The isActive logic for formatting commands is handled differently than other commands because it references the CommandStateStore. This can be found in ToolbarButton (isButtonActive)
}

export default codeShortcut
