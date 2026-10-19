import { useEffect } from 'react'
import { isSafari, isTouch } from '../../browser'
import getCaretOffset from '../../device/getCaretOffset'
import * as selection from '../../device/selection'
import touchStore from '../../stores/touchStore'

/**
 * On WebKit 27, iOS can move the caret for a tap whose touchend it withholds (#5660), then move it back to where it was
 * before the touch (#5981). Puts the caret where the tap landed instead. The touch is recorded in touchStore's
 * revertWatch by initEvents, which also ends the watch on any other input.
 */
const useRevertCorrection = ({
  editableRef,
  enabled,
  onCorrect,
}: {
  editableRef: React.RefObject<HTMLElement | null>
  /** Correct only while this editable is the one being edited, i.e. the cursor thought or its focused note. */
  enabled: boolean
  /** Places the caret at the corrected offset. Defaults to setting the selection alone. Must be stable. */
  onCorrect?: (offset: number) => void
}) => {
  useEffect(() => {
    const editable = editableRef.current
    if (!editable || !enabled || !isTouch || !isSafari()) return

    /** Notes a move away from the offset before the touch, and corrects a return to it after one. */
    const onSelectionChange = () => {
      if (document.activeElement !== editable) return
      const watch = touchStore.getState().revertWatch
      if (watch?.editable !== editable) return
      if (!selection.isCollapsed()) return
      const offset = selection.offsetFromNode(editable)
      if (offset === null) return

      if (!watch.moved && offset !== watch.before) touchStore.update({ revertWatch: { ...watch, moved: true } })
      if (!watch.moved || offset !== watch.before) return

      touchStore.update({ revertWatch: null })
      const tapped = getCaretOffset(editable, watch).offset
      if (tapped === null || tapped === watch.before) return
      // iOS is still handling the tap when it fires this selectionchange.
      requestAnimationFrame(() => (onCorrect ? onCorrect(tapped) : selection.set(editable, { offset: tapped })))
    }

    document.addEventListener('selectionchange', onSelectionChange)

    return () => {
      if (touchStore.getState().revertWatch?.editable === editable) touchStore.update({ revertWatch: null })
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [editableRef, enabled, onCorrect])
}

export default useRevertCorrection
