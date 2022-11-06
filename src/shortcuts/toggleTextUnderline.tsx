import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/UnderlineIcon'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toolbars shortcut instance of toggleTextUnderline, which toggles underline decoration of the cursor. */
const toggleTextUnderline: Shortcut = {
  id: 'toggleTextUnderline',
  label: 'Underline Toggle',
  description: 'Toggles underline of selected thought.',
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'toggleTextUnderline',
      path: state.cursor,
    })
  },
  isActive: getState => !!getState().cursor,
}

export default toggleTextUnderline
