import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/ItalicTextIcon'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toolbars shortcut instance of toggleTextItalicStyle, which toggles italic font style of the cursor. */
const toggleTextItalicStyle: Shortcut = {
  id: 'toggleTextItalicStyle',
  label: 'Italic',
  description: 'Toggles italic font style of selected thought.',
  svg: Icon,
  keyboard: { key: 'i', meta: true },
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
