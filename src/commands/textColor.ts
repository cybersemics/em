import Command from '../@types/Command'
import { toggleDropDownsActionCreator as toggleDropDowns } from '../actions/toggleDropdowns'
import TextColorWithColorPicker from '../components/icons/TextColorWithColorPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const textColor: Command = {
  id: 'textColor',
  label: 'Text Color',
  description: 'Change the text color or highlight color to your liking.',
  svg: TextColorWithColorPicker,
  canExecute: state => isDocumentEditable() && !!state.cursor,
  multicursor: {
    disallow: true,
    error: 'Cannot change text color with multiple thoughts.',
  },
  exec: (dispatch, _) => {
    dispatch(toggleDropDowns({ dropDownType: 'colorPicker' }))
  },
  isActive: state => !!state.cursor,
  isDropdownOpen: state => !!state.showColorPicker,
}

export default textColor
