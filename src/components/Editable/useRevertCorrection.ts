import { useEffect } from 'react'
import { isSafari, isTouch } from '../../browser'
import { TIMEOUT_LONG_PRESS_THOUGHT, TOUCH_SLOP } from '../../constants'
import getCaretOffset from '../../device/getCaretOffset'
import * as selection from '../../device/selection'
import multitouchStore from '../../stores/multitouchStore'

/** How long after a tap's touchend iOS can still move the caret. The slowest move back seen on a device is about 140ms. */
const TAP_SETTLE_MS = 500

/**
 * Keeps the caret where a tap landed while iOS finishes handling the tap. A slow tap a few characters from the caret,
 * held about 80ms or longer, gets no mouse events, so onMouseDown never places the caret, and within about 150ms of the
 * touchend iOS moves it back to where it was before the tap, as #4220 describes. A tap at the top or bottom edge of the
 * thought first moves it to the start or end of the thought, as #6178 describes.
 *
 * The offset is recorded at the touchend, and iOS only moves the selection, so any other offset while the tap settles is
 * one of those moves, and the caret is put back. There is nothing to write at that point, so it can be placed directly.
 */
const useRevertCorrection = ({
  editableRef,
  enabled,
  recordCaretOffset,
}: {
  editableRef: React.RefObject<HTMLElement | null>
  /** Correct only while this editable is the one being edited, i.e. the cursor thought with the keyboard open. */
  enabled: boolean
  /** Records the offset of a tap in Redux. */
  recordCaretOffset: (offset: number) => void
}) => {
  useEffect(() => {
    const editable = editableRef.current
    if (!editable || !enabled || !isTouch || !isSafari()) return

    // Where the touch in progress began, and when.
    let touchStart: { clientX: number; clientY: number; time: number } | null = null
    // The offset of the tap that is settling, and when the correction stops.
    let settling: { offset: number; until: number } | null = null

    /** Ends the correction on any other input. */
    const endSettling = () => {
      settling = null
    }

    /** Notes where a touch on the editable began. */
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStart =
        touch && e.touches.length === 1
          ? { clientX: touch.clientX, clientY: touch.clientY, time: performance.now() }
          : null
    }

    /** Records the offset of a tap. A drag or long press moves the caret itself, and a range is left to the browser. */
    const onTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      const start = touchStart
      touchStart = null
      if (
        !touch ||
        !start ||
        e.touches.length > 0 ||
        multitouchStore.getState() ||
        document.activeElement !== editable ||
        !selection.isCollapsed() ||
        Math.hypot(touch.clientX - start.clientX, touch.clientY - start.clientY) > TOUCH_SLOP ||
        // Also rules out a touchend that iOS 27 withheld until the next touch began.
        performance.now() - start.time >= TIMEOUT_LONG_PRESS_THOUGHT
      ) {
        return
      }

      const offset = getCaretOffset(editable, { clientX: touch.clientX, clientY: touch.clientY }).offset
      if (offset === null) return

      settling = { offset, until: performance.now() + TAP_SETTLE_MS }
      recordCaretOffset(offset)
    }

    /** Puts the caret back when iOS moves it away from the offset of the tap. */
    const onSelectionChange = () => {
      if (!settling || document.activeElement !== editable) return
      if (performance.now() > settling.until) {
        settling = null
        return
      }
      const offset = selection.offsetFromNode(editable)
      // A range is one of those moves too: iOS can extend the selection from the caret back to where it was. A range the
      // user makes is not, since the second touch of a double tap or a drag ends the correction first.
      if (offset === settling.offset && selection.isCollapsed()) return
      selection.set(editable, { offset: settling.offset })
    }

    editable.addEventListener('touchstart', onTouchStart, { passive: true })
    editable.addEventListener('touchend', onTouchEnd)
    // Capture, so that a handler that stops propagation cannot keep the correction running.
    document.addEventListener('touchstart', endSettling, { capture: true, passive: true })
    document.addEventListener('mousedown', endSettling, { capture: true })
    document.addEventListener('keydown', endSettling, { capture: true })
    document.addEventListener('beforeinput', endSettling, { capture: true })
    document.addEventListener('selectionchange', onSelectionChange)

    return () => {
      editable.removeEventListener('touchstart', onTouchStart)
      editable.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchstart', endSettling, { capture: true })
      document.removeEventListener('mousedown', endSettling, { capture: true })
      document.removeEventListener('keydown', endSettling, { capture: true })
      document.removeEventListener('beforeinput', endSettling, { capture: true })
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [editableRef, enabled, recordCaretOffset])
}

export default useRevertCorrection
