import { RefObject, useCallback, useState } from 'react'
import { useSelector } from 'react-redux'
import editingValueStore from '../stores/editingValue'
import viewportStore from '../stores/viewport'
import useLayoutAnimationFrameEffect from './useLayoutAnimationFrameEffect'

/**
 * Custom hook for detecting if a thought is multiline.
 *
 * This hook handles the complex timing issues involved in determining if a thought
 * spans multiple lines. It provides both immediate calculation (for current render)
 * and delayed DOM measurement (for when DOM is ready).
 *
 * Key Features:
 * - Handles cases where DOM elements don't exist yet (e.g., collapsed thoughts)
 * - Provides immediate feedback to prevent layout flickering
 * - Uses layout effects for accurate DOM measurements.
 * - Encapsulates fontSize selector to reduce prop drilling.
 *
 * @param editableRef - Reference to the editable element containing the thought text.
 * @param thoughtWrapperRef - Reference to the thought wrapper element for width comparison.
 * @param isEditing - Whether the thought is currently being edited, affects rendering.
 * @returns Boolean indicating if the thought content spans multiple lines.
 */
const useThoughtMultiline = (
  editableRef: RefObject<HTMLElement>,
  thoughtWrapperRef: RefObject<HTMLElement>,
  isEditing?: boolean,
) => {
  // Get fontSize from Redux store to avoid prop drilling
  const fontSize = useSelector(state => state.fontSize)
  // To Detect immediate editing value change
  const editingValue = editingValueStore.useSelector(state => (isEditing ? state : null))
  // To Detect device width change
  const contentWidth = viewportStore.useSelector(state => state.contentWidth)
  /**
   * Calculates whether the thought content is multiline based on DOM measurements.
   *
   * Detection Logic:
   * 1. Early return if DOM elements don't exist yet
   * 2. Check if content overflows by comparing:
   * - clientWidth vs wrapper clientWidth (container overflow).
   */
  const calculateMultiline = useCallback(() => {
    if (!editableRef.current || !thoughtWrapperRef.current) {
      return false
    }

    // Check if content overflows the available width
    return editableRef.current.clientWidth >= thoughtWrapperRef.current.clientWidth
    // calculateMultiline function should be recreated for changes of contentWidth, fontSize and editingValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableRef, thoughtWrapperRef, contentWidth, fontSize, editingValue])

  // State for delayed DOM measurement results
  const [multilineDelayed, setMultilineDelayed] = useState(false)

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
  }, [calculateMultiline, isEditing])

  /**
   * Return the combined result: either immediate calculation or delayed measurement.
   *
   * This ensures we have a value for the current render (preventing flicker)
   * while also getting accurate measurements when the DOM is ready.
   */
  return multilineDelayed || multilineImmediate
}

export default useThoughtMultiline
