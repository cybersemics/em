import { useEffect } from 'react'
import { isSafari, isTouch } from '../../browser'
import getCaretOffset from '../../device/getCaretOffset'
import * as selection from '../../device/selection'
import multitouchStore from '../../stores/multitouchStore'

/**
 * Puts the caret where a tap landed when iOS moves it back. A tap a few characters from the caret gets no mouse
 * events, so onMouseDown never places the caret, and after the touchend iOS moves the caret to the tapped word and
 * then, within about 70ms, back to where it was before the tap (#4220).
 */
const useRevertCorrection = ({
  editableRef,
  enabled,
}: {
  editableRef: React.RefObject<HTMLElement | null>
  /** Correct only while this editable is the one being edited, i.e. the cursor thought with the keyboard open. */
  enabled: boolean
}) => {
  useEffect(() => {
    const editable = editableRef.current
    if (!editable || !enabled || !isTouch || !isSafari()) return

    // The last tap on the editable: where it landed, the caret offset at its touchend, and whether the caret has left
    // that offset since. It lasts until the next input of any kind, since the revert arrives after the touchend.
    let watch: { clientX: number; clientY: number; before: number; moved: boolean } | null = null

    /** Starts watching a tap. */
    const onTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      // iOS moves the caret for a tap only after its touchend, so this is still the offset from before the tap. A drag
      // or long press has already moved the caret by now, and nothing moves it back.
      const before = selection.isCollapsed() ? selection.offsetFromNode(editable) : null
      watch =
        touch && before !== null && e.touches.length === 0 && !multitouchStore.getState()
          ? { clientX: touch.clientX, clientY: touch.clientY, before, moved: false }
          : null
    }

    /** Ends the watch on any other input. A mousedown means the tap is one that onMouseDown places itself. */
    const endWatch = () => (watch = null)

    /** Notes a move away from the offset before the tap, and corrects a return to it after one. */
    const onSelectionChange = () => {
      if (!watch || document.activeElement !== editable || !selection.isCollapsed()) return
      const offset = selection.offsetFromNode(editable)
      if (offset === null) return
      if (offset !== watch.before) {
        watch = { ...watch, moved: true }
        return
      }
      if (!watch.moved) return

      const { clientX, clientY, before } = watch
      watch = null
      const tapped = getCaretOffset(editable, { clientX, clientY }).offset
      // a tap on the caret
      if (tapped === null || tapped === before) return

      // iOS does not move the caret again after the revert, so it can be set synchronously. The cursor offset in Redux
      // is left alone, as it is for a tap that iOS places itself: nothing writes it during a tap without mouse events.
      selection.set(editable, { offset: tapped })
    }

    editable.addEventListener('touchend', onTouchEnd)
    // Capture, so that a handler that stops propagation cannot keep the watch open.
    document.addEventListener('touchstart', endWatch, { capture: true, passive: true })
    document.addEventListener('mousedown', endWatch, { capture: true })
    document.addEventListener('keydown', endWatch, { capture: true })
    document.addEventListener('beforeinput', endWatch, { capture: true })
    document.addEventListener('selectionchange', onSelectionChange)

    return () => {
      editable.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchstart', endWatch, { capture: true })
      document.removeEventListener('mousedown', endWatch, { capture: true })
      document.removeEventListener('keydown', endWatch, { capture: true })
      document.removeEventListener('beforeinput', endWatch, { capture: true })
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [editableRef, enabled])
}

export default useRevertCorrection
