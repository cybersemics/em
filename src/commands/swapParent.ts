import Command from '../@types/Command'
import { swapParentActionCreator } from '../actions/swapParent'
import SwapParentIcon from '../components/icons/SwapParentIcon'
import selectedPaths from '../selectors/selectedPaths'
import isDocumentEditable from '../util/isDocumentEditable'

const swapParent = {
  id: 'swapParent',
  label: 'Swap Parent' as const,
  systemMenu: 'Edit',
  description: 'Swap the current thought with its parent.',
  gesture: 'ul',
  multicursor: true,
  svg: SwapParentIcon,
  canExecute: state => {
    // swapParent is a no-op on a top-level thought, since there is no grandparent to swap it with. The command is therefore only executable if every selected thought is a subthought, so that a selection containing an ineligible thought disables it rather than partially applying. The selected thoughts are not necessarily the cursor, e.g. when a subthought is long pressed while the cursor is on a thought at another level.
    const paths = selectedPaths(state)
    // Selected siblings would be swapped with their parent one after another, which scrambles the subtree, so Swap Parent is disabled until it can copy the parent into each of them (#6255). This also disables Select All + Swap Parent whenever there are several siblings (#5874).
    const parentIds = paths.map(path => path[path.length - 2])
    return (
      isDocumentEditable() &&
      paths.length > 0 &&
      paths.every(path => path.length > 1) &&
      new Set(parentIds).size === parentIds.length
    )
  },
  exec: dispatch => {
    dispatch(swapParentActionCreator())
  },
} satisfies Command

export default swapParent
