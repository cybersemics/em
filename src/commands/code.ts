import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/CodeIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isSelectionFormatted from '../selectors/isSelectionFormatted'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as code. If there is no selection, formats the entire thought. */
const codeCommand = {
  id: 'code',
  label: 'Code' as const,
  description: 'Formats the current thought or selected text as code.',
  descriptionInverse: 'Removes code formatting from the current thought or selected text.',
  multicursor: { toggle: true },
  svg: Icon,
  keyboard: { key: 'k', meta: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('code'))
  },
  // The toolbar highlights formatting commands from the CommandStateStore instead, which also reflects the browser selection (see ToolbarButton).
  isActive: state => isSelectionFormatted(state, 'code'),
} satisfies Command

export default codeCommand
