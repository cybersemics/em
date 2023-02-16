import Shortcut from '../@types/Shortcut'
import formatSelection from '../action-creators/formatSelection'
// TODO: Get strikethrough icon
import Icon from '../components/icons/StarIcon'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles formatting of the current browser selection as strikethrough. If there is no selection, formats the entire thought. */
const strikethrough: Shortcut = {
  id: 'strikethrough',
  label: 'Strikethrough',
  description: 'Crosses out a thought.',
  svg: Icon,
  keyboard: { key: 'k', meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => {
    dispatch(formatSelection('strikethrough'))
  },
  isActive: getState => {
    const state = getState()
    if (!state.cursor) return false
    const thought = getThoughtById(state, head(state.cursor))
    return thought.value.includes('<strike>')
  },
}

export default strikethrough
