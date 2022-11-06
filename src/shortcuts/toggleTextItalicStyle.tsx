import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/ItalicTextIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const toggleTextItalicStyle: Shortcut = {
  id: 'toggleTextItalicStyle',
  label: 'Text Italic',
  description: 'Set italic font style to selected text.',
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'toggleTextItalicStyle',
      path: state.cursor,
    })
  },
  isActive: getState => !!getState().cursor,
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default toggleTextItalicStyle
