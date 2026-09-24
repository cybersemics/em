import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/StrikethroughIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isSelectionFormatted from '../selectors/isSelectionFormatted'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as strikethrough. If there is no selection, formats the entire thought. */
const strikethrough = {
  id: 'strikethrough',
  label: 'Strikethrough' as const,
  description: 'Formats the current thought or selected text with strikethrough.',
  descriptionInverse: 'Removes strikethrough from the current thought or selected text.',
  svg: Icon,
  keyboard: { key: 's', meta: true },
  multicursor: { toggle: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: (dispatch, getState, e) => {
    e.preventDefault()
    dispatch(formatSelection('strikethrough'))
  },
  // The toolbar highlights formatting commands from the CommandStateStore instead, which also reflects the browser selection (see ToolbarButton).
  isActive: state => isSelectionFormatted(state, 'strikethrough'),
} satisfies Command

export default strikethrough
