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
const useLayoutAnimationFrameEffect = (callback: (() => void) | undefined, dependencies: React.DependencyList) => {
  if (!callback) return

  useLayoutEffect(
    () => {
      // Wait for next frame to ensure layout is complete
      requestAnimationFrame(() => {
        // For iOS Safari first render of element, wait one more frame
        if (isTouch && isSafari()) {
          requestAnimationFrame(callback)
        } else {
          callback()
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, ...dependencies],
  )
}

export default useLayoutAnimationFrameEffect
