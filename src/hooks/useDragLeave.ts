import { debounce } from 'lodash'
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Thunk from '../@types/Thunk'
import { updateHoveringPathActionCreator as updateHoveringPath } from '../actions/updateHoveringPath'

const DEBOUNCE_DELAY = 50
let hoverCount = 0
let debouncedSetHoveringPath: ReturnType<typeof debounce> | null = null

/** Clears state.hoveringPath if it is set. */
const clearHoveringPath: Thunk = (dispatch, getState) => {
  if (getState().hoveringPath) {
    dispatch(updateHoveringPath({ path: undefined }))
  }
}

/**
 * Hook to capture the dragleave event and dispatch the updateHoveringPath action.
 */
const useDragLeave = ({ isDeepHovering, canDropThought }: { isDeepHovering: boolean; canDropThought: boolean }) => {
  const dispatch = useDispatch()
  const hoverZone = useSelector(state => state.hoverZone)
  const prevIsDeepHoveringRef = useRef(isDeepHovering)
  const prevHoverZone = useRef(hoverZone)

  // Initialize the debounced function if it hasn't been already
  if (!debouncedSetHoveringPath) {
    debouncedSetHoveringPath = debounce(() => {
      // Only set hoveringPath to undefined if hoverCount is still zero
      dispatch(clearHoveringPath)
    }, DEBOUNCE_DELAY)
  }

  useEffect(() => {
    if (prevHoverZone.current !== hoverZone) {
      // Cancel any debounce function if hovering on subthought
      prevHoverZone.current = hoverZone
      debouncedSetHoveringPath?.cancel()
      return
    }

    // If canDrop is false return
    if (!canDropThought) {
      dispatch(clearHoveringPath)
      return
    }

    if (isDeepHovering && !prevIsDeepHoveringRef.current) {
      // Cursor has entered a drop target, increase hover count
      hoverCount += 1

      // Cancel any pending debounce since we're over a drop target
      debouncedSetHoveringPath?.cancel()
    } else {
      // Cursor has left a drop target, decrease hover count
      hoverCount = Math.max(hoverCount - 1, 0)
      if (hoverCount === 0) {
        // No drop targets are being hovered over; start debounce
        debouncedSetHoveringPath?.()
      }
    }

    prevIsDeepHoveringRef.current = isDeepHovering
    prevHoverZone.current = hoverZone

    return () => {
      // Cleanup on unmount
      if (isDeepHovering) {
        if (hoverCount === 0) {
          // Start debounce when unmounting and no more drop targets are hovered
          debouncedSetHoveringPath?.()
        }
      }
    }
  }, [isDeepHovering, dispatch, hoverZone, canDropThought])
}

export default useDragLeave
