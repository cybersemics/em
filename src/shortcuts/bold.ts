import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/BoldTextIcon'
import getThoughtById from '../selectors/getThoughtById'
import formatSelection from '../util/formatSelection'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as bold. If there is no selection, formats the entire thought. */
const bold: Shortcut = {
  id: 'bold',
  label: 'Bold',
  description: 'Makes a thought bold.',
  svg: Icon,
  keyboard: { key: 'b', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    formatSelection(state, 'bold')
  },
  isActive: getState => {
    const state = getState()
    if (!state.cursor) return false
    const thought = getThoughtById(state, head(state.cursor))
    return thought.value.includes('<b>') || thought.value.includes('<strong>')
  },
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default bold
