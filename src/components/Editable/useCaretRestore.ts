import { useEffect, useRef } from 'react'
import { isSafari, isTouch } from '../../browser'
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

  useEffect(() => {
    const editable = editableRef.current
    if (!editable || !enabled || !isTouch || !isSafari()) return

    /** Marks the beginning of a touch so that a finger-driven selection drag can be told from the trackpad. */
    const onTouchStart = () => (pressingRef.current = true)

    /** Marks the end of a touch. */
    const onTouchEnd = () => (pressingRef.current = false)

    /** Pulls the selection back into the editable when the trackpad has dragged it out. */
    const onSelectionChange = () => {
      if (document.activeElement !== editable) return

      // The trackpad moves the selection without generating a single touch event in the page, so anything the
      // user did with a finger is not this. A press still in progress is a long press dragging a selection
      // within this editable; a recently ended one is a tap, which may deliberately have moved the selection to
      // a thought that is about to become the cursor.
      if (pressingRef.current || lastTouch.isRecent()) return

      // offsetFromNode is null when the selection is no longer inside the editable, or is gone entirely.
      if (selection.offsetFromNode(editable) !== null) return

      // selectionchange is queued rather than dispatched synchronously, so this cannot recurse; and a set that
      // the browser declines fires no event at all, so it cannot spin either.
      selection.set(editable, { end })
    }

    editable.addEventListener('touchstart', onTouchStart)
    editable.addEventListener('touchend', onTouchEnd)
    document.addEventListener('selectionchange', onSelectionChange)

    return () => {
      editable.removeEventListener('touchstart', onTouchStart)
      editable.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [editableRef, enabled, end])
}

export default useCaretRestore
