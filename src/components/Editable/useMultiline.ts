import { RefObject, useCallback, useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import useLayoutAnimationFrameEffect from '../../hooks/useLayoutAnimationFrameEffect'
import editingValueStore from '../../stores/editingValue'
import viewportStore, { ViewportState } from '../../stores/viewport'

/**
 * Detects if a thought is multiline using height measurement.
 *
 * Threshold: fontSize * 2 + 4px buffer
 * Performance optimized to avoid re-renders during typing.
 *
 * @param editableRef - Reference to the editable element.
 * @param isEditing - Whether the thought is currently being edited, affects rendering.
 * @returns Boolean indicating if content spans multiple lines.
 */
const useMultiline = (editableRef: RefObject<HTMLElement>, isEditing?: boolean) => {
  const [multiline, setMultiline] = useState(false)
  const fontSize = useSelector(state => state.fontSize)
  // While editing, watch the current Value and trigger the layout effect
  const editingValue = editingValueStore.useSelector(state => (isEditing ? state : null))
  // To Detect new thought is focused
  const editingCursor = useSelector(state => state.cursor)

  /**
   * Calculate if content is multiline by comparing element height to threshold.
   * Threshold: fontSize * 2 + 4px buffer for padding and line-height variations.
   */
  const updateMultiline = useCallback(() => {
    if (!editableRef.current) return

    const singleLineThreshold = fontSize * 2 + 4
    // Update multiline state
    setMultiline(editableRef.current!.clientHeight > singleLineThreshold)
  }, [editableRef, fontSize])

  // Two effects for immediate and fallback detection
  useLayoutEffect(updateMultiline, [updateMultiline, editingValue, editingCursor])
  useLayoutAnimationFrameEffect(updateMultiline, [updateMultiline, editingValue, editingCursor])

  const selectInnerWidth = useCallback((state: ViewportState) => state.innerWidth, [])
  // re-measure when the screen is resized
  viewportStore.useSelectorEffect(updateMultiline, selectInnerWidth)

  return multiline
}

export default useMultiline
