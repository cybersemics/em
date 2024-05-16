import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import DragThoughtZone from '../@types/DragThoughtZone'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'

/** Updates state.hoveringPath when isHovering becomes true. Used to determine the parent of state.hoveringPath to be highlighted (via isChildHovering in the Thought components), expandHoverDown/Top, and the visibility of drop-hover elements. */
const useHoveringPath = (path: Path, isHovering: boolean, hoverZone: DropThoughtZone) => {
  const dispatch = useDispatch()

  // When DropEmpty is hovered over during drag, update the hoveringPath.
  useEffect(
    () => {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHovering],
  )
}

export default useHoveringPath
