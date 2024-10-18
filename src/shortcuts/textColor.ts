import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/TextColorWithColorPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const textColor: Shortcut = {
  id: 'textColor',
  label: 'Text Color',
  description: 'Change the text color or highlight color to your liking.',
  svg: Icon,
  canExecute: state => isDocumentEditable() && !!state.cursor,
  multicursor: {
    enabled: false,
    error: 'Cannot change text color with multiple thoughts.',
  },
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'toggleColorPicker',
      path: state.cursor,
    })
  },
  isActive: state => !!state.cursor,
  isDropdownOpen: state => !!state.showColorPicker,
}

export default textColor
