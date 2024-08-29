import Shortcut from '../@types/Shortcut'
import { swapParentActionCreator } from '../actions/swapParent'
import SwapParentIcon from '../components/icons/SwapParentIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const swapParent: Shortcut = {
  id: 'swapParent',
  label: 'Swap Parent',
  description: 'Swap the current thought with its parent.',
  svg: SwapParentIcon,
  canExecute: getState => isDocumentEditable() && (getState().cursor?.length ?? 0) >= 2,
  exec: dispatch => {
    dispatch(swapParentActionCreator())
  },
}

export default swapParent
