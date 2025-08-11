import { RefObject, useCallback, useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import editingValueStore from '../stores/editingValue'
import viewportStore from '../stores/viewport'

/**
 * Custom hook for detecting if a thought is multiline.
 *
 * This hook handles the timing issues involved in determining if a thought
 * spans multiple lines. It uses useLayoutEffect to update state before the browser
 * paints, preventing flickering while following React best practices.
 *
 * Key Features:
 * - Handles cases where DOM elements don't exist yet (e.g., collapsed thoughts)
 * - Prevents layout flickering by updating before browser paints
 * - Uses layout effects for accurate DOM measurements when DOM is ready
 * - Encapsulates fontSize selector to reduce prop drilling
 * - Follows React best practices (no DOM access during render).
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

  // State for multiline detection
  const [isMultiline, setIsMultiline] = useState(false)

  /**
   * Update multiline state before browser paints to prevent flickering.
   *
   * UseLayoutEffect runs synchronously after all DOM mutations but before
   * the browser paints, ensuring the line-height change happens immediately
   * without visual flickering.
   *
   * This handles all cases including:
   * - Initial render when DOM elements are created
   * - Content changes that affect text width
   * - Window resize events
   * - Dynamic content loading.
   */
  useLayoutEffect(() => {
    const result = calculateMultiline()
    setIsMultiline(result)
  }, [calculateMultiline])

  return isMultiline
}

export default useThoughtMultiline
