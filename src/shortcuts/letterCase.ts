import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/LetterCaseWithPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the letter case picker. */
const letterCase: Shortcut = {
  id: 'letterCase',
  label: 'LetterCase',
  description: 'Change the Letter case.',
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  multicursor: {
    enabled: false,
    error: () => 'Cannot change text color with multiple thoughts.',
  },
  exec: dispatch => {
    dispatch({ type: 'toggleLetterCase' })
  },
  isActive: getState => !!getState().cursor,
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default letterCase
