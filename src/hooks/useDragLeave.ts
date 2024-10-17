import { debounce } from 'lodash'
import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { updateHoveringPathActionCreator } from '../actions/updateHoveringPath'
import useSortedContext from './useSortedContext'

const DEBOUNCE_DELAY = 50
let hoverCount = 0
let debouncedSetHoveringPath: ReturnType<typeof debounce> | null = null

/**
 * Hook to capture the dragleave event and dispatch the dragInProgress action.
 */
const useDragLeave = ({ isDeepHovering }: { isDeepHovering: boolean }) => {
  const dispatch = useDispatch()
  const prevIsDeepHoveringRef = useRef(isDeepHovering)
  const { hoveringOnDropEnd } = useSortedContext()

  // Initialize the debounced function if it hasn't been already
  if (!debouncedSetHoveringPath) {
    debouncedSetHoveringPath = debounce(() => {
      // Only set hoveringPath to undefined if hoverCount is still zero
      dispatch(updateHoveringPathActionCreator({ path: undefined }))
    }, DEBOUNCE_DELAY)
  }

  useEffect(() => {
    if (isDeepHovering && !prevIsDeepHoveringRef.current) {
      // Cursor has entered a drop target
      hoverCount += 1

      // Cancel any pending debounce since we're over a drop target
      debouncedSetHoveringPath?.cancel()
    } else if (!isDeepHovering && prevIsDeepHoveringRef.current) {
      // Cursor has left a drop target
      if (hoverCount === 0 && !hoveringOnDropEnd) {
        // No drop targets are being hovered over; start debounce
        debouncedSetHoveringPath?.()
      }
    }

    prevIsDeepHoveringRef.current = isDeepHovering

    return () => {
      // Cleanup on unmount
      if (isDeepHovering) {
        hoverCount = Math.max(hoverCount - 1, 0)

        if (hoverCount === 0) {
          // Start debounce when unmounting and no more drop targets are hovered
          debouncedSetHoveringPath?.()
        }
      }
    }
  }, [isDeepHovering, dispatch, hoveringOnDropEnd])
}
export default useDragLeave
