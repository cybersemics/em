import { debounce } from 'lodash'
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Thunk from '../@types/Thunk'
import { updateHoveringPathActionCreator as updateHoveringPath } from '../actions/updateHoveringPath'
import ministore from '../stores/ministore'

const DEBOUNCE_DELAY = 50

/** The number of drop targets currently deep-hovered, shared by every drop target. A ministore rather than a module variable so that resetStores clears it between tests. Read imperatively; nothing subscribes, so a pointer event never re-renders. */
const hoverCountStore = ministore(0)

/** The debounced clear of state.hoveringPath, created on the first render. Its pending call is cancelled at every test boundary with the rest of lodash's throttles and debounces (see setupTests). */
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
  // Whether this drop target is currently counted in hoverCount. Starts false so that mounting contributes nothing
  // until the cursor actually enters.
  const isCountedRef = useRef(false)
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

    // If canDrop is false, clear hovering path and return
    if (!canDropThought) {
      dispatch(clearHoveringPath)
      return
    }

    // Only a change in isDeepHovering means the cursor entered or left this drop target. The effect also re-runs when
    // the component mounts and when canDropThought changes, and those must not touch the shared hoverCount: otherwise
    // any thought mounting mid-drag decrements the count to zero and clears hoveringPath while a target is still
    // hovered, dropping the drop indicator.
    if (isDeepHovering !== isCountedRef.current) {
      isCountedRef.current = isDeepHovering
      if (isDeepHovering) {
        // Cursor has entered a drop target, increase hover count
        hoverCountStore.update(hoverCountStore.getState() + 1)

        // Cancel any pending debounce since we're over a drop target
        debouncedSetHoveringPath?.cancel()
      } else {
        // Cursor has left a drop target, decrease hover count
        hoverCountStore.update(Math.max(hoverCountStore.getState() - 1, 0))
        if (hoverCountStore.getState() === 0) {
          // No drop targets are being hovered over; start debounce
          debouncedSetHoveringPath?.()
        }
      }
    }

    prevHoverZone.current = hoverZone
  }, [isDeepHovering, dispatch, hoverZone, canDropThought])

  // Release this drop target's contribution to hoverCount when it unmounts mid-drag, e.g. when the layout unmounts a
  // thought that the cursor is over. Empty deps are load-bearing: React runs an effect's cleanup before every re-run,
  // not only on unmount, so this cannot be folded into the effect above. It closes over refs and module state only,
  // so it never goes stale.
  useEffect(
    () => () => {
      if (!isCountedRef.current) return
      isCountedRef.current = false
      hoverCountStore.update(Math.max(hoverCountStore.getState() - 1, 0))
      if (hoverCountStore.getState() === 0) {
        debouncedSetHoveringPath?.()
      }
    },
    [],
  )
}

export default useDragLeave
