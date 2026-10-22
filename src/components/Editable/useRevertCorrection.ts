import { useEffect } from 'react'
import { isSafari, isTouch } from '../../browser'
import getCaretOffset from '../../device/getCaretOffset'
import * as selection from '../../device/selection'
import touchStore from '../../stores/touchStore'

/**
 * IOS can move the caret for a tap that gets no mouse events and then move it back to where it was before the touch,
 * either after the touchend (#4220) or, on WebKit 27, before a touchend it withholds (#5981). Puts the caret where the
 * tap landed instead. The touch is recorded in touchStore's revertWatch by initEvents, which also ends the watch on
 * any other input.
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
      // the selection belongs to another editable
      if (document.activeElement !== editable) return
      const watch = touchStore.getState().revertWatch
      // no touch on this editable is being watched
      if (watch?.editable !== editable) return
      // a range is not a caret that iOS placed or reverted, e.g. a word selected by a double tap
      if (!selection.isCollapsed()) return
      const offset = selection.offsetFromNode(editable)
      // the caret is not inside this editable
      if (offset === null) return

      if (!watch.moved && offset !== watch.before) touchStore.update({ revertWatch: { ...watch, moved: true } })
      // not a revert: the caret has not left its offset yet, or has moved somewhere other than back to it
      if (!watch.moved || offset !== watch.before) return

      touchStore.update({ revertWatch: null })
      const tapped = getCaretOffset(editable, watch).offset
      // nowhere to put the caret, or the tap was on the caret, so there is nothing to undo
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
