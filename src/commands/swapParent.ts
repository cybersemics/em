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
    // swapParent is only defined for a single thought, as each swap restructures the tree that the next swap would act on. The selected thought is not necessarily the cursor, e.g. when a subthought is long pressed while the cursor is on a thought at another level.
    // It is also a no-op on a top-level thought, since there is no grandparent to swap it with.
    const paths = selectedPaths(state)
    return isDocumentEditable() && paths.length === 1 && paths[0].length > 1
  },
  exec: dispatch => {
    dispatch(swapParentActionCreator())
  },
}

export default swapParent
