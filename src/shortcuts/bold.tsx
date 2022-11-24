import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/BoldTextIcon'
import findDescendant from '../selectors/findDescendant'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toolbars shortcut instance of bold, which toggles bold font weight of the cursor. */
const bold: Shortcut = {
  id: 'bold',
  label: 'Bold',
  description: 'Makes a thought bold.',
  svg: Icon,
  keyboard: { key: 'b', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'bold',
      path: state.cursor,
    })
  },
  isActive: getState => {
    const state = getState()
    return !!state.cursor && !!findDescendant(state, head(state.cursor), ['=style', 'fontWeight', '700'])
  },
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default bold
