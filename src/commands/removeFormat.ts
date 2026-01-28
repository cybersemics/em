import Command from '../@types/Command'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
// TODO: Needs icon
import Icon from '../components/icons/BoldTextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Removes formatting of the current browser selection. If there is no selection, clears formatting of the entire thought. */
const removeFormat = {
  id: 'removeFormat',
  label: 'Clear Formatting',
  description: 'Clears all formatting from the current thought or selected text.',
  multicursor: true,
  svg: Icon,
  keyboard: { key: '0', meta: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(formatSelection('removeFormat'))
  },
} satisfies Command

export default removeFormat
