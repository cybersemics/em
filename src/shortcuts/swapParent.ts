import Shortcut from '../@types/Shortcut'
import { swapParentActionCreator } from '../actions/swapParent'
import SwapParentIcon from '../components/icons/SwapParentIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const swapParent: Shortcut = {
  id: 'swapParent',
  label: 'Swap Parent',
  description: 'Swap the current thought with its parent.',
  multicursor: {
    enabled: false,
    error: () => 'Cannot swap parent with multiple thoughts.',
  },
  svg: SwapParentIcon,
  canExecute: getState => {
    const state = getState()
    return isDocumentEditable() && ((state.cursor?.length ?? 0) >= 2 || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(swapParentActionCreator())
  },
}

export default swapParent
