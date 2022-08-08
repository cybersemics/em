import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/TextColor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const textColor: Shortcut = {
  id: 'textColor',
  label: 'Text Color',
  description:
    'Change the text color or background color to your liking. You could use chartreuse if you are feeling masochistic.',
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'toggleColorPicker',
      path: state.cursor,
    })
  },
  isActive: getState => !!getState().cursor,
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default textColor
