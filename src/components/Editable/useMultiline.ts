import { RefObject, useCallback, useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import useLayoutAnimationFrameEffect from '../../hooks/useLayoutAnimationFrameEffect'
import editingValueStore from '../../stores/editingValue'
import viewportStore from '../../stores/viewport'

/**
 * Detects if a thought is multiline using height measurement.
 *
 * Threshold: fontSize * 2 + 4px buffer
 * Performance optimized to avoid re-renders during typing.
 *
 * @param editableRef - Reference to the editable element.
 * @returns Boolean indicating if content spans multiple lines.
 */
const useMultiline = (editableRef: RefObject<HTMLElement>) => {
  // State for multiline detection
  const [isMultiline, setIsMultiline] = useState(false)
  // Get current fontSize
  const fontSize = useSelector(state => state.fontSize)
  /**
   * Calculate if content is multiline by comparing element height to threshold.
   * Threshold: fontSize * 2 + 4px buffer for padding and line-height variations.
   */
  const calculateMultiline = useCallback(() => {
    if (!editableRef.current) {
      return false
    }

    const singleLineThreshold = fontSize * 2 + 4
    return editableRef.current!.clientHeight > singleLineThreshold
  }, [editableRef, fontSize])

  // Update multiline state
  const updateMultiline = useCallback(() => {
    const multilineState = calculateMultiline()
    setIsMultiline(multilineState)
  }, [calculateMultiline])

  // Two effects for immediate and fallback detection
  useLayoutEffect(updateMultiline, [updateMultiline])
  useLayoutAnimationFrameEffect(updateMultiline, [updateMultiline])

  // Detect editing value changes
  editingValueStore.useLayoutEffect(updateMultiline)
  editingValueStore.useLayoutAnimationFrameEffect(updateMultiline)

  // Detect viewport changes
  viewportStore.useLayoutEffect(updateMultiline)
  viewportStore.useLayoutAnimationFrameEffect(updateMultiline)

  return isMultiline
}

export default useMultiline
