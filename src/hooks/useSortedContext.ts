import { useDragDropManager } from 'react-dnd'
import { shallowEqual, useSelector } from 'react-redux'
import DragThoughtItem from '../@types/DragThoughtItem'
import DropThoughtZone from '../@types/DropThoughtZone'
import attributeEquals from '../selectors/attributeEquals'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** A hook that checks if a dragging thought is hovering over a sorted context, and returns new rank where that thought will be dropped. */
const useSortedContext = () => {
  const dragDropManager = useDragDropManager()

  return useSelector(state => {
    if (!state.hoveringPath) {
      return { isHoveringSorted: false, newRank: -1 }
    }

    const contextParentPath = parentOf(state.hoveringPath)

    // Check if the drop target is on sorted context children or on its parent.
    const isSortedContext =
      state.hoverZone === DropThoughtZone.ThoughtDrop &&
      attributeEquals(state, head(contextParentPath), '=sort', 'Alphabetical')

    // check if the hovering path is on a drop end of parent sorted context
    const hoveringOnDropEnd =
      state.hoverZone === 'SubthoughtsDrop' && attributeEquals(state, head(state.hoveringPath), '=sort', 'Alphabetical')

    if (!isSortedContext && !hoveringOnDropEnd) {
      return { isHoveringSorted: false, newRank: -1 }
    }

    const monitor = dragDropManager.getMonitor()
    const item = monitor.getItem() as DragThoughtItem

    // Check if the dragged item is a thought and the drop zone is not a subthought
    const isThought = item?.zone === 'Thoughts'
    const sourceThoughtId = head(item?.path || [])

    // get the source thought and its new rank
    const sourceThought = isThought ? getThoughtById(state, sourceThoughtId) : null
    const contextpath = hoveringOnDropEnd ? state.hoveringPath : contextParentPath
    const newRank = getSortedRank(state, head(contextpath), sourceThought?.value || '')

    return { isHoveringSorted: true, newRank }
  }, shallowEqual)
}

export default useSortedContext
