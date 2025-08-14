import { RefObject, useCallback, useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import editingValueStore from '../stores/editingValue'
import viewportStore from '../stores/viewport'
import useLayoutAnimationFrameEffect from './useLayoutAnimationFrameEffect'

/**
 * Custom hook for detecting if a thought is multiline.
 *
 * This hook uses a dual-effect strategy for robust multiline detection:
 * - Height-based detection with threshold to account for padding and line-height differences
 * - Immediate synchronous updates to prevent flickering
 * - Asynchronous safety net to catch edge cases.
 *
 * Threshold calculation: fontSize * 2 + 4px buffer
 * - fontSize * 2: Accounts for line-height of 2 for single-line thoughts
 * - +4px buffer: Accounts for padding and subtle line-height variations.
 *
 * Key Features:
 * - Handles cases where DOM elements don't exist yet (e.g., collapsed thoughts)
 * - Prevents layout flickering by updating before browser paints
 * - Uses dual effects for maximum reliability and edge case handling
 * - Encapsulates fontSize selector to reduce prop drilling
 * - Follows React best practices (no DOM access during render).
 *
 * @param editableRef - Reference to the editable element containing the thought text.
 * @returns Boolean indicating if the thought content spans multiple lines.
 */
const useThoughtMultiline = (editableRef: RefObject<HTMLElement>) => {
  // Get fontSize from Redux store to avoid prop drilling
  const fontSize = useSelector(state => state.fontSize)
  // To Detect immediate editing value change
  const editingValue = editingValueStore.useSelector(state => state)
  // To Detect device width change
  const contentWidth = viewportStore.useSelector(state => state.contentWidth)
  /**
   * Calculates whether the thought content is multiline based on DOM measurements.
   *
   * Detection Logic:
   * 1. Early return if DOM elements don't exist yet
   * 2. Calculate single line threshold: fontSize * 2 + 4px buffer
   * - fontSize * 2: Accounts for line-height of 2 for single-line thoughts
   * - +4px buffer: Accounts for padding and subtle line-height variations
   * 3. Check if content height exceeds the threshold.
   *
   * This approach ensures accurate detection while accounting for CSS differences
   * between single-line (line-height: 2) and multiline (line-height: 1.25) modes.
   */
  const calculateMultiline = useCallback(() => {
    if (!editableRef.current) {
      return false
    }

    // Single line height threshold with buffer for padding and line-height differences
    const singleLineThreshold = fontSize * 2 + 4 // 4px buffer for padding and line-height variations

    // Check if content height is greater than the threshold
    // This is the definitive indicator of multiline content
    return editableRef.current.clientHeight > singleLineThreshold
    // calculateMultiline function should be recreated for changes of contentWidth, fontSize and editingValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableRef, contentWidth, fontSize, editingValue])

  // State for multiline detection
  const [isMultiline, setIsMultiline] = useState(false)

  /**
   * Dual-effect strategy for robust multiline detection:
   *
   * 1. UseLayoutEffect: Immediate synchronous update to prevent flickering
   * - Runs synchronously after DOM mutations but before browser paints
   * - Ensures line-height changes happen immediately without visual glitches
   * - Handles most common cases: initial render, content changes, window resize.
   *
   * 2. UseLayoutAnimationFrameEffect: Asynchronous safety net for edge cases
   * - Runs on next animation frame to catch any missed changes
   * - Handles edge cases where DOM updates are delayed or batched
   * - Acts as a "belt and suspenders" approach for maximum reliability.
   *
   * This dual approach ensures:
   * - No flickering during rapid content changes
   * - No missed updates due to browser timing issues
   * - Robust handling of all edge cases.
   */
  useLayoutEffect(() => {
    setIsMultiline(calculateMultiline())
  }, [calculateMultiline])

  useLayoutAnimationFrameEffect(() => {
    setIsMultiline(calculateMultiline())
  }, [calculateMultiline])

  return isMultiline
}

export default useThoughtMultiline
