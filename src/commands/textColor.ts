import Command from '../@types/Command'
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
    enabled: false,
    error: 'Cannot change text color with multiple thoughts.',
  },
  exec: (dispatch, getState) => {
    const state = getState()
    if (state.showLetterCase) dispatch({ type: 'toggleLetterCase' })
    if (state.showSortPicker) dispatch({ type: 'toggleSortPicker' })
    dispatch({
      type: 'toggleColorPicker',
      path: state.cursor,
    })
  },
  isActive: state => !!state.cursor,
  isDropdownOpen: state => !!state.showColorPicker,
}

export default textColor
