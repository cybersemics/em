import { RefObject, useCallback, useState } from 'react'
import useLayoutAnimationFrameEffect from './useLayoutAnimationFrameEffect'

/**
 * This hook handles timing issues and provides both immediate and delayed calculations
 * to prevent layout flickering while ensuring accurate measurements
 * Detects if thought content spans multiple lines.
 * Handles timing issues between immediate calculation and DOM measurement.
 *
 * Key Features:
 * - Prevents flickering with immediate feedback
 * - Handles collapsed thoughts and dynamic content
 * - Excludes ellipsized URLs from detection.
 */
const useThoughtMultiline = (
  editableRef: RefObject<HTMLElement>,
  thoughtWrapperRef: RefObject<HTMLElement>,
  value: string,
  ellipsizedUrl: boolean,
  fontSize: number,
  isEditing?: boolean,
) => {
  // State for delayed DOM measurement results
  const [multilineDelayed, setMultilineDelayed] = useState(false)

  /**
   * Calculates whether the thought content is multiline based on DOM measurements.
   *
   * Detection Logic:
   * 1. Early return if URL should be ellipsized (prevents multiline for URLs)
   * 2. Early return if DOM elements don't exist yet
   * 3. Check if content overflows by comparing:
   * - clientWidth vs wrapper clientWidth (container overflow).
   */
  const calculateMultiline = useCallback(() => {
    // Don't detect multiline for URLs that should be ellipsized
    if (ellipsizedUrl || !editableRef.current || !thoughtWrapperRef.current) {
      return false
    }

    // Check if content overflows the available width
    return editableRef.current.clientWidth >= thoughtWrapperRef.current.clientWidth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ellipsizedUrl, editableRef, thoughtWrapperRef, fontSize])

  // Immediate calculation for current render (prevents flickering)
  const multilineImmediate = calculateMultiline()

  /**
   * Delayed calculation using layout effects for when DOM is fully ready.
   *
   * This handles edge cases like:
   * - Collapsed thoughts being expanded
   * - Dynamic content loading
   * - DOM elements not yet created.
   *
   * The layout effect ensures we get accurate measurements after the DOM
   * has been updated but before the browser paints.
   */
  useLayoutAnimationFrameEffect(() => {
    setMultilineDelayed(calculateMultiline())
  }, [value, calculateMultiline, isEditing])

  /**
   * Return the combined result: either immediate calculation or delayed measurement.
   *
   * This ensures we have a value for the current render (preventing flicker)
   * while also getting accurate measurements when the DOM is ready.
   */
  return multilineDelayed || multilineImmediate
}

export default useThoughtMultiline
