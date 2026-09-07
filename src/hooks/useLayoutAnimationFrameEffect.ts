import { useLayoutEffect } from 'react'
import { isSafari, isTouch } from '../browser'

/**
 * The useLayoutEffect + requestAnimationFrame provides the optimal balance for height recalculation:
 * 1. The useLayoutEffect hook runs synchronously before browser paint, ensuring we catch layout changes early
 * 2. While useEffect can be delayed multiple frames causing visible flicker
 * 3. The requestAnimationFrame inside useLayoutEffect waits for the next frame after layout changes
 * 4. This ensures we capture the final height after all style/layout updates are applied
 * 5. On iOS Safari, we need an additional frame due to its unique rendering pipeline
 * This approach minimizes flicker while still capturing accurate dimensions.
 */
const useLayoutAnimationFrameEffect = (
  callback: (() => void | (() => void)) | undefined,
  dependencies: React.DependencyList,
) => {
  if (!callback) return

  useLayoutEffect(
    () => {
      const destroyCallbackRef: { current: void | (() => void) } = { current: undefined }
      // The frame is stored so that cleanup can cancel it while it is still queued. callback is itself a
      // dependency and is usually re-created on every render, so this effect re-runs constantly; without the
      // cancel, each render leaves another frame queued and they pile up until they all fire at once, each
      // measuring a thought that has since re-rendered or unmounted.
      const frameRef: { current: number } = { current: 0 }

      // Wait for next frame to ensure layout is complete
      frameRef.current = requestAnimationFrame(() => {
        // For iOS Safari first render of element, wait one more frame
        if (isTouch && isSafari()) {
          frameRef.current = requestAnimationFrame(() => {
            destroyCallbackRef.current = callback()
          })
        } else {
          destroyCallbackRef.current = callback()
        }
      })

      return () => {
        cancelAnimationFrame(frameRef.current)
        if (destroyCallbackRef.current) {
          destroyCallbackRef.current()
          destroyCallbackRef.current = undefined
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, ...dependencies],
  )
}

export default useLayoutAnimationFrameEffect
