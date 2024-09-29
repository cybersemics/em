import { useDragDropManager } from 'react-dnd'
import { useSelector } from 'react-redux'
import DragThoughtItem from '../@types/DragThoughtItem'
import DropThoughtZone from '../@types/DropThoughtZone'
import attributeEquals from '../selectors/attributeEquals'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** A hook that checks if a dragging thought is hovering over a sorted context, and returns new rank where that thought will be dropped. */
const useSortedContext = () => {
  const hoveringPath = useSelector(state => state.hoveringPath)
  const contextParentPath = parentOf(hoveringPath || [])

  // check if the hoevring path is on a sorted context
  const isSortedContext = useSelector(state => {
    // Check if the drop target is on sorted context children or on its parent.
    const isContextChildren = attributeEquals(state, head(contextParentPath), '=sort', 'Alphabetical')
    const thoughtDrop = state.hoverZone === DropThoughtZone.ThoughtDrop

    return isContextChildren && thoughtDrop
  })

  // check if the hovering path is on a drop end of parent sorted context
  const hoveringOnDropEnd = useSelector(state => {
    const dropTargetId = head(state.hoveringPath || [])
    const isContextParent = attributeEquals(state, dropTargetId, '=sort', 'Alphabetical')

    return state.hoverZone === 'SubthoughtsDrop' && isContextParent
  })

  const dragDropManager = useDragDropManager()

  // get the source thought and its new rank
  const sourceThought = useSelector(state => {
    const monitor = dragDropManager.getMonitor()
    const item = monitor.getItem() as DragThoughtItem

    // Check if the dragged item is a thought and the drop zone is not a subthought
    const isThought = item?.zone === 'Thoughts'
    const sourceThoughtId = head(item?.path || [])

    const sourceThought = isThought ? getThoughtById(state, sourceThoughtId) : null
    return sourceThought
  })

  const newRank = useSelector(state => getSortedRank(state, head(contextParentPath), sourceThought?.value || ''))

  return {
    isSortedContext,
    newRank,
    sourceThought,
    hoveringOnDropEnd,
  }
}

export default useSortedContext
