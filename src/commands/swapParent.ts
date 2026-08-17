import Command from '../@types/Command'
import { swapParentActionCreator } from '../actions/swapParent'
import SwapParentIcon from '../components/icons/SwapParentIcon'
import selectedPaths from '../selectors/selectedPaths'
import isDocumentEditable from '../util/isDocumentEditable'

const swapParent: Command = {
  id: 'swapParent',
  label: 'Swap Parent',
  description: 'Swap the current thought with its parent.',
  gesture: 'ul',
  multicursor: true,
  svg: SwapParentIcon,
  canExecute: state => {
    // swapParent is a no-op on a top-level thought, since there is no grandparent to swap it with. The selected thought is not necessarily the cursor, e.g. when a subthought is long pressed while the cursor is on a thought at another level.
    // A selected top-level thought is skipped rather than blocking the rest of the selection, so the command is executable as long as at least one selected thought can be swapped.
    const paths = selectedPaths(state)
    return isDocumentEditable() && paths.some(path => path.length > 1)
  },
  exec: dispatch => {
    dispatch(swapParentActionCreator())
  },
}

export default swapParent
