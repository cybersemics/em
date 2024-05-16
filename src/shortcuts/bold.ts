import Shortcut from '../@types/Shortcut'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import Icon from '../components/icons/BoldTextIcon'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as bold. If there is no selection, formats the entire thought. */
const bold: Shortcut = {
  id: 'bold',
  label: 'Bold',
  description: 'Bolds the a thought or selected text.',
  descriptionInverse: 'Removes bold formatting from the current thought.',
  svg: Icon,
  keyboard: { key: 'b', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => {
    dispatch(formatSelection('bold'))
  },
  isActive: getState => {
    const state = getState()
    if (!state.cursor) return false
    const thought = getThoughtById(state, head(state.cursor))
    return thought.value.includes('<b>') || thought.value.includes('<strong>')
  },
}

export default bold
