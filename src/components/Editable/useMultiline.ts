import { RefObject, useCallback, useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import useLayoutAnimationFrameEffect from '../../hooks/useLayoutAnimationFrameEffect'
import cursorStore from '../../stores/cursor'
import editingValueStore from '../../stores/editingValue'
import viewportStore, { ViewportState } from '../../stores/viewport'

/**
 * Detects if a thought is multiline using height measurement.
 *
 * Threshold: fontSize * 2 + 4px buffer
 * Performance optimized to avoid re-renders during typing and cursor changes.
 *
 * @param editableRef - Reference to the editable element.
 * @param isEditing - Whether the thought is currently being edited, affects rendering.
 * @returns Boolean indicating if content spans multiple lines.
 */
const useMultiline = (editableRef: RefObject<HTMLElement>, isEditing?: boolean) => {
  const [multiline, setMultiline] = useState(false)
  const fontSize = useSelector(state => state.fontSize)

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
  useLayoutEffect(updateMultiline, [updateMultiline])
  useLayoutAnimationFrameEffect(updateMultiline, [updateMultiline])

  const updateEditingMultiline = useCallback(() => {
    if (isEditing) updateMultiline()
  }, [updateMultiline, isEditing])

  // Detect cursor changes without causing re-renders
  cursorStore.useLayoutEffect(updateMultiline)

  // While editing, watch the current Value and trigger the layout effect
  editingValueStore.useLayoutEffect(updateEditingMultiline)
  // This is for table view mode - when column2 is merged into column1, we need to re-measure
  // Reference Video - https://github.com/user-attachments/assets/de49ae80-9829-47e9-a890-f3d760b818b9
  editingValueStore.useLayoutAnimationFrameEffect(updateEditingMultiline)

  const selectInnerWidth = useCallback((state: ViewportState) => state.innerWidth, [])
  // re-measure when the screen is resized
  viewportStore.useSelectorEffect(updateMultiline, selectInnerWidth)

  return multiline
}

export default useMultiline
