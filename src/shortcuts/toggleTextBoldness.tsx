import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/BoldTextIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const toggleTextBoldness: Shortcut = {
  id: 'toggleTextBoldness',
  label: 'Text Bold',
  description: 'Set bold font weight to selected text.',
  svg: Icon,
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
