import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/UnderlineIcon'
import getThoughtById from '../selectors/getThoughtById'
import formatSelection from '../util/formatSelection'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as underline. If there is no selection, formats the entire thought. */
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
