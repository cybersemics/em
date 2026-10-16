import { useEffect, useRef } from 'react'
import { isSafari, isTouch } from '../../browser'
import { TOUCH_SLOP } from '../../constants'
import getCaretOffset from '../../device/getCaretOffset'
import * as selection from '../../device/selection'
import lastTouch from './lastTouch'

/**
 * Keeps the caret inside the editable the user is editing while the keyboard is open. The iOS keyboard trackpad
 * (long press the space bar) moves the browser selection by hit-testing the whole document, so it drags the
 * selection clean out of the editing host. Unlike a tap it never moves the focus, leaving the editable focused
 * with the caret stranded somewhere else: the keyboard stays up while typing goes nowhere. Restoring only while
 * this editable still holds the focus is what distinguishes that from the many flows that legitimately move the
 * selection away after blurring it (selection.clear, the Command Center, drag start) (#3276).
 */
const useCaretRestore = ({
  editableRef,
  enabled,
  end,
}: {
  editableRef: React.RefObject<HTMLElement | null>
  /** Restore only while this editable is the one being edited, i.e. the cursor thought or its focused note. */
  enabled: boolean
  /** Restore the caret to the end of the text rather than the start. */
  end?: boolean
}) => {
  const pressingRef = useRef(false)
  const scrubbingRef = useRef(false)
  // The last touch, where it landed, and the caret before it, until the user does anything else.
  const revertWatchRef = useRef<{
    clientX: number
    clientY: number
    before: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const editable = editableRef.current
    if (!editable || !enabled || !isTouch || !isSafari()) return

    /** Marks the beginning of a touch so that a finger-driven selection drag can be told from the trackpad. */
    const onTouchStart = (e: TouchEvent) => {
      pressingRef.current = true
      // A finger back on the page ends the trackpad session, so any range from here is the user's own.
      scrubbingRef.current = false

      const touch = e.touches[0]
      const before = selection.isCollapsed() ? selection.offsetFromNode(editable) : null
      revertWatchRef.current =
        touch && before !== null ? { clientX: touch.clientX, clientY: touch.clientY, before, moved: false } : null
    }

    /** Marks the end of a touch. */
    const onTouchEnd = () => {
      pressingRef.current = false
    }

    /** Marks the end of a touch that iOS took over, e.g. for a scroll. */
    const onTouchCancel = () => {
      pressingRef.current = false
      revertWatchRef.current = null
    }

    /** Ends the watch on any other input: a touch or click anywhere, a key, or an edit. A tap with mouse events is placed by useEditMode's onMouseDown or the browser, not reverted. */
    const endWatch = () => {
      revertWatchRef.current = null
    }

    /** Ends the watch for a touch that moved farther than a tap, since a caret drag crossing its starting offset is not a revert. */
    const onTouchMove = (e: TouchEvent) => {
      const watch = revertWatchRef.current
      const touch = e.touches[0]
      if (!watch || !touch) return
      if (Math.hypot(touch.clientX - watch.clientX, touch.clientY - watch.clientY) > TOUCH_SLOP) {
        revertWatchRef.current = null
      }
    }

    /** Puts the caret back and remembers that a trackpad drag is underway. */
    const restore = () => {
      // selectionchange is queued rather than dispatched synchronously, so this cannot recurse; and a set that
      // the browser declines fires no event at all, so it cannot spin either.
      selection.set(editable, { end })
      scrubbingRef.current = true
    }

    /** IOS can move the caret for a tap that gets no mouse events and then move it back to where it was before the touch, either after the touchend (#4220) or, on WebKit 27, before a touchend it withholds (#5981). Puts it where the tap landed instead. */
    const correctRevert = () => {
      const watch = revertWatchRef.current
      if (!watch) return
      if (!selection.isCollapsed()) return
      const offset = selection.offsetFromNode(editable)
      if (offset === null) return
      if (offset !== watch.before) {
        watch.moved = true
        return
      }
      if (!watch.moved) return

      revertWatchRef.current = null
      const tapped = getCaretOffset(editable, watch).offset
      if (tapped === null || tapped === watch.before) return
      // iOS is still handling the tap when it fires this selectionchange.
      requestAnimationFrame(() => selection.set(editable, { offset: tapped }))
    }

    /** Pulls the selection back into the editable when the trackpad has dragged it out. */
    const onSelectionChange = () => {
      if (document.activeElement !== editable) return
      correctRevert()
      // The trackpad moves the selection without generating a single touch event in the page, so anything the
      // user did with a finger is not this. A press still in progress is a long press dragging a selection
      // within this editable; a recently ended one is a tap, which may deliberately have moved the selection to
      // a thought that is about to become the cursor.
      if (pressingRef.current || lastTouch.isRecent()) return
      // offsetFromNode is null when the selection is no longer inside the editable, or is gone entirely.
      if (selection.offsetFromNode(editable) === null) return restore()
      // The caret we just restored becomes the anchor the still-running drag extends from, selecting everything
      // between it and the finger. Only a drag we have already pulled back once can do this, so the latch keeps
      // Select All and the drag handles — neither of which is collapsed either — out of it.
      if (scrubbingRef.current && !selection.isCollapsed()) restore()
    }

    // Capture, so that a touch on this editable ends the old watch before onTouchStart begins a new one.
    document.addEventListener('touchstart', endWatch, { capture: true })
    document.addEventListener('mousedown', endWatch)
    editable.addEventListener('keydown', endWatch)
    editable.addEventListener('beforeinput', endWatch)
    editable.addEventListener('touchstart', onTouchStart)
    editable.addEventListener('touchmove', onTouchMove, { passive: true })
    editable.addEventListener('touchend', onTouchEnd)
    editable.addEventListener('touchcancel', onTouchCancel)
    document.addEventListener('selectionchange', onSelectionChange)

    return () => {
      scrubbingRef.current = false
      revertWatchRef.current = null
      document.removeEventListener('touchstart', endWatch, { capture: true })
      document.removeEventListener('mousedown', endWatch)
      editable.removeEventListener('keydown', endWatch)
      editable.removeEventListener('beforeinput', endWatch)
      editable.removeEventListener('touchstart', onTouchStart)
      editable.removeEventListener('touchmove', onTouchMove)
      editable.removeEventListener('touchend', onTouchEnd)
      editable.removeEventListener('touchcancel', onTouchCancel)
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [editableRef, enabled, end])
}

export default useCaretRestore
