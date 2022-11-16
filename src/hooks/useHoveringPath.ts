import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import DragThoughtZone from '../@types/DragThoughtZone'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import dragInProgress from '../action-creators/dragInProgress'

/** Updates state.hoveringPath when isHovering becomes true. Used to determine the parent of state.hoveringPath to be highlighted (via isChildHovering in the Thought components), expandHoverBottom/Top, and the visibility of drop-hover elements. */
const useHoveringPath = (path: Path, isHovering: boolean, hoverZone: DropThoughtZone) => {
  const dispatch = useDispatch()

  // When SubthoughtsDropEmpty is hovered over during drag, update the hoveringPath.
  useEffect(() => {
    if (isHovering) {
      dispatch((dispatch, getState) => {
        const state = getState()

        // check dragInProgress to ensure the drag has not been aborted (e.g. by shaking)
        if (!state.dragInProgress) return

        dispatch(
          dragInProgress({
            value: true,
            draggingThought: state.draggingThought,
            hoveringPath: path,
            hoverZone,
            sourceZone: DragThoughtZone.Thoughts,
          }),
        )
      })
    }
  }, [isHovering])
}

export default useHoveringPath
