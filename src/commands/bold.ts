import Command from '../@types/Command'
import FormattingCommand from '../@types/FormattingCommand'
import { formatWithTagActionCreator as formatWithTag } from '../actions/formatWithTag'
import Icon from '../components/icons/BoldTextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as bold. If there is no selection, formats the entire thought. */
const bold: Command = {
  id: 'bold',
  label: 'Bold',
  description: 'Bolds the current thought or selected text.',
  descriptionInverse: 'Removes bold from the current thought or selected text.',
  multicursor: true,
  svg: Icon,
  keyboard: { key: 'b', meta: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatWithTag(FormattingCommand.bold))
  },
  // The isActive logic for formatting commands is handled differently than other commands because it references the CommandStateStore. This can be found in ToolbarButton (isButtonActive)
}

export default bold
