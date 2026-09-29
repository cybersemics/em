import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/UnderlineIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isSelectionFormatted from '../selectors/isSelectionFormatted'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as underline. If there is no selection, formats the entire thought. */
const underline = {
  id: 'underline',
  label: 'Underline' as const,
  description: 'Underlines the current thought or selected text.',
  descriptionInverse: 'Removes the underline from the current thought or selected text.',
  svg: Icon,
  keyboard: { key: 'u', meta: true },
  multicursor: {
    preventSetCursor: true,
    toggle: true,
  },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('underline'))
  },
  // The toolbar highlights formatting commands from the CommandStateStore instead, which also reflects the browser selection (see ToolbarButton).
  isActive: state => isSelectionFormatted(state, 'underline'),
} satisfies Command

export default underline
