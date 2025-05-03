import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import Icon from '../components/icons/LetterCaseWithPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the letter case picker. */
const letterCase: Command = {
  id: 'letterCase',
  label: 'LetterCase',
  description: 'Change the Letter case.',
  svg: Icon,
  canExecute: state => isDocumentEditable() && !!state.cursor,
  multicursor: false,
  exec: (dispatch, _) => {
    dispatch(toggleDropdown({ dropDownType: 'letterCase' }))
  },
  isActive: state => !!state.cursor,
  isDropdownOpen: state => !!state.showLetterCase,
}

export default letterCase
