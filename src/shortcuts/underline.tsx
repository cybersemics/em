import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/UnderlineIcon'
import getThoughtById from '../selectors/getThoughtById'
import formatSelection from '../util/formatSelection'
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
    formatSelection(state, 'underline')
  },
  isActive: getState => {
    const state = getState()
    if (!state.cursor) return false
    const thought = getThoughtById(state, head(state.cursor))
    return thought.value.includes('<u>')
  },
}

export default underline
