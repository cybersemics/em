import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/UnderlineIcon'
import hasMulticursor from '../selectors/hasMulticursor'
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
  },
  canExecute: state => {
    return isDocumentEditable() && !state.noteFocus && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('underline'))
  },
  // The isActive logic for formatting commands is handled differently than other commands because it references the CommandStateStore. This can be found in ToolbarButton (isButtonActive)
}

export default underline
