import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/LetterCaseWithPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the letter case picker. */
const letterCase: Shortcut = {
  id: 'letterCase',
  label: 'LetterCase',
  description: 'Change the Letter case.',
  svg: Icon,
  canExecute: state => isDocumentEditable() && !!state.cursor,
  multicursor: {
    enabled: false,
    error: () => 'Cannot change text color with multiple thoughts.',
  },
  exec: dispatch => {
    dispatch({ type: 'toggleLetterCase' })
  },
  isActive: state => !!state.cursor,
  isDropdownOpen: state => !!state.showLetterCase,
}

export default letterCase
