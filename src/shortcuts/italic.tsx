import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/ItalicTextIcon'
import findDescendant from '../selectors/findDescendant'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toolbars shortcut instance of italic, which toggles italic font style of the cursor. */
const italic: Shortcut = {
  id: 'italic',
  label: 'Italic',
  description: 'Italicizes a thought.',
  svg: Icon,
  keyboard: { key: 'i', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'italic',
      path: state.cursor,
    })
  },
  isActive: getState => {
    const state = getState()
    return !!state.cursor && !!findDescendant(state, head(state.cursor), ['=style', 'fontStyle', 'italic'])
  },
  isDropdownOpen: getState => !!getState().showColorPicker,
}

export default italic
