import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/LetterCaseWithPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const lettercase: Shortcut = {
  id: 'lettercase',
  label: 'Lettercase',
  description: 'Change the Letter case.',
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  multicursor: {
    enabled: false,
    error: () => 'Cannot change text color with multiple thoughts.',
  },
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'toggleLettercase',
      path: state.cursor,
    })
  },
  isActive: getState => !!getState().cursor,
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default lettercase
