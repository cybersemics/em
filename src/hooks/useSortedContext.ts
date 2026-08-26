import { useDragDropManager } from 'react-dnd'
import { shallowEqual, useSelector } from 'react-redux'
import DragThoughtItem from '../@types/DragThoughtItem'
import DropThoughtZone from '../@types/DropThoughtZone'
import attributeEquals from '../selectors/attributeEquals'
import contextThoughtId from '../selectors/contextThoughtId'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import headId from '../util/headId'
import parentOf from '../util/parentOf'

/** A hook that checks if a dragging thought is hovering over a sorted context, and returns new rank where that thought will be dropped. */
const useSortedContext = () => {
  const dragDropManager = useDragDropManager()

  return useSelector(state => {
    if (!state.hoveringPath) {
      return { isHoveringSorted: false, newRank: -1 }
    }

    const contextParentPath = parentOf(state.hoveringPath)

    // =sort is read from the displayed thought, i.e. the context in the context view.
    // null when hovering over a root child, where there is no parent row (parentOf returns an empty Path).
    const contextParentId = contextParentPath.length > 0 ? contextThoughtId(state, contextParentPath) : null

    // Check if the drop target is on sorted context children or on its parent.
    const isSortedContext =
      state.hoverZone === DropThoughtZone.ThoughtDrop &&
      attributeEquals(state, contextParentId, '=sort', 'Alphabetical')

    // check if the hovering path is on a drop end of parent sorted context
    const hoveringOnDropEnd =
      state.hoverZone === 'SubthoughtsDrop' &&
      attributeEquals(state, contextThoughtId(state, state.hoveringPath), '=sort', 'Alphabetical')

    if (!isSortedContext && !hoveringOnDropEnd) {
      return { isHoveringSorted: false, newRank: -1 }
    }

    const monitor = dragDropManager.getMonitor()
    const item = monitor.getItem() as DragThoughtItem

    // Check if the dragged item is a thought and the drop zone is not a subthought
    const isThought = item?.zone === 'Thoughts'

    // get the source thought and its new rank
    // the Lexeme instance, since that is the thought the drop moves and re-ranks (see moveThought)
    const sourceThought = isThought && item?.path ? getThoughtById(state, headId(item.path)) : null
    const contextpath = hoveringOnDropEnd ? state.hoveringPath : contextParentPath
    // the rank is computed among the children of the thought the row lands on, i.e. the Lexeme instance
    const newRank = getSortedRank(state, headId(contextpath), sourceThought?.value || '')

    return { isHoveringSorted: true, newRank }
  }, shallowEqual)
}

export default useSortedContext
