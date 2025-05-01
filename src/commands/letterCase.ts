import Command from '../@types/Command'
import { toggleDropDownsActionCreator as toggleDropDowns } from '../actions/toggleDropdowns'
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
    dispatch(toggleDropDowns({ dropDownType: 'letterCase' }))
  },
  isActive: state => !!state.cursor,
  isDropdownOpen: state => !!state.showLetterCase,
}

export default letterCase
