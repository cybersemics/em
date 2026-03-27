import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/StrikethroughIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as strikethrough. If there is no selection, formats the entire thought. */
const strikethrough: Command = {
  id: 'strikethrough',
  label: 'Strikethrough',
  description: 'Formats the current thought or selected text with strikethrough.',
  descriptionInverse: 'Removes strikethrough from the current thought or selected text.',
  svg: Icon,
  keyboard: { key: 's', meta: true },
  multicursor: true,
  canExecute: state => {
    return isDocumentEditable() && !state.noteFocus && (!!state.cursor || hasMulticursor(state))
  },
  exec: (dispatch, getState, e) => {
    e.preventDefault()
    dispatch(formatSelection('strikethrough'))
  },
  // The isActive logic for formatting commands is handled differently than other commands because it references the CommandStateStore. This can be found in ToolbarButton (isButtonActive)
}

export default strikethrough
