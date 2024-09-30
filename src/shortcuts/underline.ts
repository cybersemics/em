import Shortcut from '../@types/Shortcut'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/UnderlineIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as underline. If there is no selection, formats the entire thought. */
const underline: Shortcut = {
  id: 'underline',
  label: 'Underline',
  description: 'Underlines a thought or selected text.',
  descriptionInverse: 'Removes the underline from the current thought.',
  svg: Icon,
  keyboard: { key: 'u', meta: true },
  multicursor: {
    enabled: true,
    preventSetCursor: true,
  },
  canExecute: getState => {
    const state = getState()
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('underline'))
  },
  // the activation logic for commands is located in ToolbarButton (isCommandActive)
}

export default underline
