import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/BoldTextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isSelectionFormatted from '../selectors/isSelectionFormatted'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as bold. If there is no selection, formats the entire thought. */
const bold = {
  id: 'bold',
  label: 'Bold' as const,
  description: 'Bolds the current thought or selected text.',
  descriptionInverse: 'Removes bold from the current thought or selected text.',
  multicursor: { toggle: true },
  svg: Icon,
  keyboard: { key: 'b', meta: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('bold'))
  },
  // The toolbar highlights formatting commands from the CommandStateStore instead, which also reflects the browser selection (see ToolbarButton).
  isActive: state => isSelectionFormatted(state, 'bold'),
} satisfies Command

export default bold
