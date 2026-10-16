import Command from '../@types/Command'
import { swapParentActionCreator } from '../actions/swapParent'
import SwapParentIcon from '../components/icons/SwapParentIcon'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import selectedPaths from '../selectors/selectedPaths'
import isAttribute from '../util/isAttribute'
import isDocumentEditable from '../util/isDocumentEditable'

const swapParent = {
  id: 'swapParent',
  label: 'Swap Parent' as const,
  description: 'Swap the current thought with its parent.',
  gesture: 'ul',
  multicursor: true,
  svg: SwapParentIcon,
  canExecute: state => {
    // swapParent is a no-op on a top-level thought, since there is no grandparent to swap it with. The command is therefore only executable if every selected thought is a subthought, so that a selection containing an ineligible thought disables it rather than partially applying. The selected thoughts are not necessarily the cursor, e.g. when a subthought is long pressed while the cursor is on a thought at another level.
    // A metaprogramming attribute cannot be swapped with its parent, nor can the child of one, since either swap would move the attribute off the thought that it applies to.
    const paths = selectedPaths(state)
    return (
      isDocumentEditable() &&
      paths.length > 0 &&
      paths.every(
        path =>
          path.length > 1 && childIdsToThoughts(state, path.slice(-2)).every(thought => !isAttribute(thought.value)),
      )
    )
  },
  exec: dispatch => {
    dispatch(swapParentActionCreator())
  },
} satisfies Command

export default swapParent
