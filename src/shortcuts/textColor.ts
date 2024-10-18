import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/TextColorWithColorPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const textColor: Shortcut = {
  id: 'textColor',
  label: 'Text Color',
  description: 'Change the text color or highlight color to your liking.',
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  multicursor: {
    enabled: false,
    error: () => 'Cannot change text color with multiple thoughts.',
  },
  exec: (dispatch, getState) => {
    const state = getState()
    if (state.showLetterCase) dispatch({ type: 'toggleLetterCase' })
    dispatch({
      type: 'toggleColorPicker',
      path: state.cursor,
    })
  },
  isActive: getState => !!getState().cursor,
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default textColor
