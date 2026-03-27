import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import TextColorWithColorPicker from '../components/icons/TextColorWithColorPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const textColor: Command = {
  id: 'textColor',
  label: 'Text Color',
  description: 'Change the text color or highlight color to your liking.',
  svg: TextColorWithColorPicker,
  canExecute: state => isDocumentEditable() && !state.noteFocus && !!state.cursor,
  multicursor: {
    disallow: true,
    error: 'Cannot change text color with multiple thoughts.',
  },
  exec: (dispatch, _) => {
    dispatch(toggleDropdown({ dropDownType: 'colorPicker' }))
  },
  isActive: state => !!state.cursor,
  isDropdownOpen: state => !!state.showColorPicker,
}

export default textColor
