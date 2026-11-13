import { useEffect } from 'react'
import { isSafari, isTouch } from '../../browser'
import { TIMEOUT_LONG_PRESS_THOUGHT, TOUCH_SLOP } from '../../constants'
import getCaretOffset from '../../device/getCaretOffset'
import * as selection from '../../device/selection'
import multitouchStore from '../../stores/multitouchStore'
import stepRevertWatch, { RevertWatch } from './stepRevertWatch'

/**
 * How far inside the first or last line of text, in pixels, a tap can land and still count as a tap at the edge of
 * the thought. The caret jumps for a tap within about 2px of the line box or beyond it, and a tap counted as an edge
 * tap that does not jump costs nothing, since iOS's own first move then ends the edge check.
 */
const EDGE_MARGIN = 4

/** Returns which edge of the thought's text the point is at, if any. */
const edgeOf = (editable: HTMLElement, clientY: number): 'start' | 'end' | null => {
  const range = document.createRange()
  range.selectNodeContents(editable)
  const rects = Array.from(range.getClientRects()).filter(rect => rect.height > 0)
  if (rects.length === 0) return null
  const top = Math.min(...rects.map(rect => rect.top))
  const bottom = Math.max(...rects.map(rect => rect.bottom))
  return clientY < top + EDGE_MARGIN ? 'start' : clientY > bottom - EDGE_MARGIN ? 'end' : null
}

/**
 * Keeps the caret where a tap landed while iOS finishes handling the tap. A slow tap a few characters from the caret,
 * held about 80ms or longer, gets no mouse events, so onMouseDown never places the caret, and within about 150ms of the
 * touchend iOS moves it back to where it was before the tap, as #4220 describes. A tap above the first line of text or
 * below the last first moves it to the start or end of the thought, as #6178 describes.
 *
 * The offset is recorded at the touchend, and only for a tap. The touchend gives only where the finger lifted, so the
 * touchstart is noted too, and its distance and time from the touchend rule out a drag, a long press and a touchend
 * iOS 27 withheld until the next touch, each of which would otherwise record an offset that was never tapped.
 *
 * The watch follows iOS's moves until the next input, with no timer. The first move is either the jump to the start or
 * end, which is put back only if the tap was at that edge, or the placement at the tapped word. That can be the other
 * end of the word from getCaretOffset's choice, so it is recorded instead. The move back to where the caret was before
 * the tap is put back, and moves in between are left alone, since iOS can pass through another offset on its way back.
 * After the move back, iOS does not move the caret again, so any other move ends the watch. It can come from
 * elsewhere, such as the space bar scrub, which delivers no event to the page. Which move is which is decided by
 * stepRevertWatch, and the hook carries out its decision.
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
    // The tap being watched, if any.
    let watch: RevertWatch | null = null

    /** Ends the watch on any other input. */
    const endWatch = () => {
      watch = null
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

      // iOS moves the caret for a tap only after its touchend, so this is still the offset from before the tap.
      const before = selection.offsetFromNode(editable)
      const offset = getCaretOffset(editable, { clientX: touch.clientX, clientY: touch.clientY }).offset
      if (before === null || offset === null) return

      watch = { offset, before, edge: edgeOf(editable, touch.clientY), phase: 'awaiting' }
      recordCaretOffset(offset)
    }

    /** Puts the caret back after the moves iOS makes for a tap, and leaves any other move alone. */
    const onSelectionChange = () => {
      // Only a tap on this editable is watched, and only while it keeps the focus. A selection that has left the
      // editable is not one this watch can put back.
      if (!watch || document.activeElement !== editable) return
      const range = selection.offsetRange(editable)
      // iOS's moves after a tap are all moves of a collapsed caret, so a range is left to the browser.
      if (!range || range.start !== range.end) return

      const step = stepRevertWatch(watch, { current: range.start, length: editable.textContent?.length ?? 0 })
      watch = step.watch
      if (!step.watch) return
      if (step.effect === 'putBack') selection.set(editable, { offset: step.watch.offset })
      else if (step.effect === 'record') recordCaretOffset(step.watch.offset)
    }

    editable.addEventListener('touchstart', onTouchStart, { passive: true })
    editable.addEventListener('touchend', onTouchEnd)
    // Capture, so that a handler that stops propagation cannot keep the watch open.
    document.addEventListener('touchstart', endWatch, { capture: true, passive: true })
    document.addEventListener('mousedown', endWatch, { capture: true })
    document.addEventListener('keydown', endWatch, { capture: true })
    document.addEventListener('beforeinput', endWatch, { capture: true })
    document.addEventListener('selectionchange', onSelectionChange)

    return () => {
      editable.removeEventListener('touchstart', onTouchStart)
      editable.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchstart', endWatch, { capture: true })
      document.removeEventListener('mousedown', endWatch, { capture: true })
      document.removeEventListener('keydown', endWatch, { capture: true })
      document.removeEventListener('beforeinput', endWatch, { capture: true })
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [editableRef, enabled, recordCaretOffset])
}

export default useRevertCorrection
