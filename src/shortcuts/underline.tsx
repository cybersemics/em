import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/UnderlineIcon'
import findDescendant from '../selectors/findDescendant'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toolbars shortcut instance of underline, which toggles underline decoration of the cursor. */
const underline: Shortcut = {
  id: 'underline',
  label: 'Underline',
  description: 'Underlines a thought.',
  svg: Icon,
  keyboard: { key: 'u', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({
      type: 'underline',
      path: state.cursor,
    })
  },
  isActive: getState => {
    const state = getState()
    return !!state.cursor && !!findDescendant(state, head(state.cursor), ['=style', 'textDecoration', 'underline'])
  },
}

export default underline
