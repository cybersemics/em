import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/BoldTextIcon'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toolbars shortcut instance of toggleTextBoldness, which toggles bold font weight of the cursor. */
const toggleTextBoldness: Shortcut = {
  id: 'toggleTextBoldness',
  label: 'Boldness Toggle',
  description: 'Toggles bold font weight of selected thought.',
  svg: Icon,
  keyboard: { key: 'b', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'toggleTextBoldness',
      path: state.cursor,
    })
  },
  isActive: getState => !!getState().cursor,
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default toggleTextBoldness
