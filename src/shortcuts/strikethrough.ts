import Shortcut from '../@types/Shortcut'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/StrikethroughIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as strikethrough. If there is no selection, formats the entire thought. */
const strikethrough: Shortcut = {
  id: 'strikethrough',
  label: 'Strikethrough',
  description: 'Formats a thought or selected text with strikethrough.',
  descriptionInverse: 'Removes strikethrough formatting from the current thought or selected text.',
  svg: Icon,
  keyboard: { key: 's', meta: true },
  multicursor: true,
  canExecute: getState => {
    const state = getState()
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: (dispatch, getState, e) => {
    e.preventDefault()
    dispatch(formatSelection('strikethrough'))
  },
  // the activation logic for commands is located in ToolbarButton (isCommandActive)
}

export default strikethrough
