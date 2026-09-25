import { useDragDropManager } from 'react-dnd'
import { shallowEqual, useSelector } from 'react-redux'
import DragThoughtItem from '../@types/DragThoughtItem'
import DropThoughtZone from '../@types/DropThoughtZone'
import attributeEquals from '../selectors/attributeEquals'
import getSortedPlacement from '../selectors/getSortedPlacement'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** Checks whether a dragged thought hovers over a sorted context and projects its insertion gap for hover arrows. */
const useSortedContext = () => {
  const dragDropManager = useDragDropManager()

  return useSelector(state => {
    if (!state.hoveringPath) {
      return { isHoveringSorted: false, placementRank: -1 }
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
      return { isHoveringSorted: false, placementRank: -1 }
    }

    const monitor = dragDropManager.getMonitor()
    const items = monitor.getItem() as DragThoughtItem[] | undefined
    const item = Array.isArray(items) ? items[0] : undefined

    // Check if the dragged item is a thought and the drop zone is not a subthought
    const isThought = item?.zone === 'Thoughts'
    const sourceThoughtId = head(item?.path || [])

    // Get the source thought and its sorted placement.
    const sourceThought = isThought ? getThoughtById(state, sourceThoughtId) : null
    const contextpath = hoveringOnDropEnd ? state.hoveringPath : contextParentPath
    const afterId = getSortedPlacement(state, head(contextpath), sourceThought?.value || '', {
      created: sourceThought?.created,
      staleId: sourceThought?.id,
    })

    // This number is only a view coordinate for hover arrows, never a document write target.
    const placementRank = afterId ? getThoughtById(state, afterId)!.rank + 0.5 : -0.5
    return { isHoveringSorted: true, placementRank }
  }, shallowEqual)
}

export default useSortedContext
