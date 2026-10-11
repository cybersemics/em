import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/ItalicTextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isSelectionFormatted from '../selectors/isSelectionFormatted'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as italic. If there is no selection, formats the entire thought. */
const italic = {
  id: 'italic',
  label: 'Italic' as const,
  description: 'Italicizes the current thought or selected text.',
  descriptionInverse: 'Removes italics from the current thought or selected text. So much for being special.',
  svg: Icon,
  keyboard: { key: 'i', meta: true },
  multicursor: { toggle: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('italic'))
  },
  // The toolbar highlights formatting commands from the CommandStateStore instead, which also reflects the browser selection (see ToolbarButton).
  isActive: state => isSelectionFormatted(state, 'italic'),
} satisfies Command

export default italic
