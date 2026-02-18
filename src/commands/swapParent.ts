import Command from '../@types/Command'
import { swapParentActionCreator } from '../actions/swapParent'
import SwapParentIcon from '../components/icons/SwapParentIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const swapParent: Command = {
  id: 'swapParent',
  label: 'Swap Parent',
  description: 'Swap the current thought with its parent.',
  gesture: 'ul',
  multicursor: {
    disallow: true,
    error: 'Cannot swap parent with multiple thoughts.',
  },
  svg: SwapParentIcon,
  canExecute: state => {
    return isDocumentEditable() && ((state.cursor?.length ?? 0) >= 2 || hasMulticursor(state))
  },
  exec: dispatch => {
    dispatch(swapParentActionCreator())
  },
}

export default swapParent
