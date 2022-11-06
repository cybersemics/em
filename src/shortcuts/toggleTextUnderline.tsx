import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/UnderlineIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const toggleTextUnderline: Shortcut = {
  id: 'toggleTextUnderline',
  label: 'Text Underline',
  description: 'Underline selected text.',
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
