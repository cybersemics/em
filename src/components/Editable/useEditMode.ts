import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useStore } from 'react-redux'
import Path from '../../@types/Path'
import { isMac, isSafari, isTouch } from '../../browser'
import { LongPressState } from '../../constants'
import asyncFocus from '../../device/asyncFocus'
import preventAutoscroll from '../../device/preventAutoscroll'
import * as selection from '../../device/selection'
import usePrevious from '../../hooks/usePrevious'
import hasMulticursor from '../../selectors/hasMulticursor'
import equalPath from '../../util/equalPath'
import getNodeOffsetForVoidArea from '../../util/getNodeOffsetForVoidArea'

/** Squared movement threshold (px²) for distinguishing taps from scrolls; ~10px finger movement. */
const SCROLL_THRESHOLD_SQ = 100

/** Automatically sets the selection on the given contentRef element when the thought should be selected. Handles a variety of conditions that determine whether this should occur. */
const useEditMode = ({
  contentRef,
  isEditing,
  path,
  style,
  transient,
  onCaretOffset,
}: {
  // expect all arguments to be passed, even if undefined
  // otherwise the hook will not be able to determine all conditions
  contentRef: React.RefObject<HTMLInputElement | null>
  isEditing: boolean
  path: Path
  style: React.CSSProperties | undefined
  transient: boolean | undefined
  /** Called when the void-area logic sets a caret position, allowing the caller to update Redux cursor state. */
  onCaretOffset: (offset: number) => void
}) => {
  // must re-render when noteFocus changes in order to set the selection
  const hasNoteFocus = useSelector(state => state.noteFocus && equalPath(state.cursor, path))
  const editing = useSelector(state => state.isKeyboardOpen)
  const isMulticursor = useSelector(hasMulticursor)
  const noteFocus = useSelector(state => state.noteFocus)
  const dragHold = useSelector(state => state.longPress === LongPressState.DragHold)
  const dragInProgress = useSelector(state => state.longPress === LongPressState.DragInProgress)
  const disabledRef = useRef(false)
  const editableNonce = useSelector(state => state.editableNonce)
  const showSidebar = useSelector(state => state.showSidebar)
  const fontSize = useSelector(state => state.fontSize)
  const isCursor = useSelector(state => equalPath(path, state.cursor))
  const hadSidebar = usePrevious(showSidebar)
  const store = useStore()

  // focus on the ContentEditable element if editing or on desktop
  const editMode = !isTouch || editing
  const editingOrOnCursor = isCursor || editing

  /**
   * Stores a custom caret position for iOS touch interactions temporarily.
   * Computed on touchstart. Applied on touchend, or on mousedown if it runs first or touchend doesn't run at all.
   * The following mousedown clears state so synthetic mouse does not re-run node offset calculation. Touchmove clears pending on scroll.
   */
  const pendingCaretOffsetRef = useRef<number | null>(null)

  /** True once pending void-area offset was applied (touchend or mousedown), until gesture ends. */
  const voidAreaCaretAppliedRef = useRef(false)

  /** Stores the initial touch position to detect tap vs scroll; if focus occurs without it, the tap was outside the editable and we place the caret manually. */
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)

  // Declarative selection effect: sets selection when the thought should be selected.
  useEffect(
    () => {
      // Get the cursorOffset directly from the store rather than subscribing to it reactively with useSelector.
      // Otherwise, it will try to set the selection while typing.
      const { cursorOffset, lastUndoableActionType } = store.getState()

      /** Set the selection to the current Editable at the cursor offset. */
      const setSelectionToCursorOffset = () => {
        // do not set the selection on hidden thoughts, otherwise it will cause a faulty focus event when switching windows
        // https://github.com/cybersemics/em/issues/1596
        if (style?.visibility === 'hidden') {
          selection.clear()
        } else {
          selection.set(contentRef.current, { offset: cursorOffset ?? 0 })
        }
      }

      // allow transient editable to have focus on render
      const shouldSetSelection =
        transient ||
        (isEditing &&
          editMode &&
          !noteFocus &&
          contentRef.current &&
          (cursorOffset !== null || !selection.isThought()) &&
          !isMulticursor &&
          !dragHold &&
          !disabledRef.current)

      if (shouldSetSelection) {
        preventAutoscroll(contentRef.current)

        /*
        When a new thought is created, the Shift key should be on when Auto-Capitalization is enabled.
        On Mobile Safari, Auto-Capitalization is broken if the selection is set synchronously (#999).
        Only breaks on Enter or Backspace, not gesture.

        setTimeout fixes it, however it introduces an infinite loop when a nested empty thought is created.
        Not calling asyncFocus when the selection is already on a thought prevents the infinite loop.
        Also, setTimeout is frequently pushed into the next frame and the keyboard will intermittently close on iOS Safari.
        Replacing setTimeout with requestAnimationFrame guarantees (hopefully?) that it will be processed before the next repaint,
        keeping the keyboard open while rapidly deleting thoughts. (#3129)

        If the last action is swapParent, set the selection synchronously to keep the focus stable after the swap.
      */
        if (isTouch && isSafari() && lastUndoableActionType !== 'swapParent' && !selection.isThought()) {
          asyncFocus()
        }

        setSelectionToCursorOffset()
      }
    },
    // React Hook useEffect has missing dependencies: 'contentRef', 'editMode', and 'style?.visibility'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dragHold,
      isEditing,
      // update selection when multicursor changes, otherwise the selection will not be set when multicursor is cleared
      isMulticursor,
      hasNoteFocus,
      dragInProgress,
      noteFocus,
      // Must subscribe to isKeyboardOpen and not when keyboard is open for some reason.
      // Otherwise it breaks selection offset persistence on refresh on desktop.
      editing,
      editableNonce,
      store,
      transient,
    ],
  )

  // Provide an escape hatch to allow the next default selection rather than setting it.
  // This allows the user to set the selection in the middle of a non-cursor thought when keyboard is open.
  // Otherwise the caret is moved to the beginning of the thought.
  const allowDefaultSelection = useCallback(() => {
    disabledRef.current = true
    // enable on next tick, which is long enough to skip the next setSelectionToCursorOffset
    setTimeout(() => {
      disabledRef.current = false
    })
  }, [])

  // Void-area caret positioning: attaches native event handlers (with passive: false
  // where needed for preventDefault) to compute and apply caret offsets when the user
  // taps/clicks on empty space within the editable element.
  useEffect(() => {
    const editable = contentRef.current
    if (!editable) return

    /** Sets the DOM selection and notifies the caller to update Redux cursor state. */
    const setCaretOffset = (nodeOffset: number) => {
      selection.set(editable, { offset: nodeOffset })
      onCaretOffset(nodeOffset)
    }

    /**
     * Handles mousedown for void-area caret positioning.
     * On desktop, computes the void-area offset directly.
     * On touch devices, the caret is already transparent from touchstart;
     * we let the browser handle the synthetic mousedown and defer to the
     * touchend rAF to apply the correct offset and reveal the caret.
     */
    const onMouseDown = (e: MouseEvent) => {
      const isMultiselectClick = isMac ? e.metaKey : e.ctrlKey
      if (isMultiselectClick || !editingOrOnCursor || isMulticursor) return

      // Prevent the browser from autoscrolling to this editable element.
      // For some reason doesn't work on touchend.
      preventAutoscroll(editable, {
        // about the height of a single-line thought
        bottomMargin: fontSize * 2,
      })

      // If the caret was already applied, do not apply it again
      if (voidAreaCaretAppliedRef.current) {
        voidAreaCaretAppliedRef.current = false
        return
      }

      const { isVoidArea, offset: nodeOffset } = getNodeOffsetForVoidArea(editable, {
        clientX: e.clientX,
        clientY: e.clientY,
      })

      if (nodeOffset !== null) {
        // do not prevent default if the tap is on a valid character bounding box
        if (isVoidArea) {
          e.preventDefault()
        }
        setCaretOffset(nodeOffset)
      } else {
        allowDefaultSelection()
      }
    }

    /**
     * Sets the caret for void-area taps immediately and hides the native caret
     * so the browser's subsequent repositioning (between touchstart and
     * mousedown) is invisible. The correct position is re-applied and the caret
     * revealed in mousedown (with preventDefault) or via a rAF in touchend.
     */
    const onTouchStart = (e: TouchEvent) => {
      // Android Chrome manual caret positioning is handled in onMouseDown
      if (!isSafari()) return

      if (!editingOrOnCursor || isMulticursor || e.touches.length === 0) return
      const touch = e.touches[0]
      if (!touch) return

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }

      const { offset: nodeOffset } = getNodeOffsetForVoidArea(editable, {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      if (nodeOffset !== null) {
        editable.style.caretColor = 'transparent'
        pendingCaretOffsetRef.current = nodeOffset
      } else {
        pendingCaretOffsetRef.current = null
        allowDefaultSelection()
      }
    }

    /** Cancels the pending void-area caret offset if the user scrolls past the threshold. */
    const onTouchMove = (e: TouchEvent) => {
      // Android Chrome manual caret positioning is handled in onMouseDown
      if (!isSafari()) return

      if (e.touches.length === 0 || !touchStartPosRef.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - touchStartPosRef.current.x
      const dy = touch.clientY - touchStartPosRef.current.y
      if (dx * dx + dy * dy > SCROLL_THRESHOLD_SQ) {
        pendingCaretOffsetRef.current = null
        editable.style.caretColor = ''
        voidAreaCaretAppliedRef.current = false
      }
    }

    /** Finalizes the void-area caret after touch processing completes. */
    const onTouchEnd = () => {
      // Android Chrome manual caret positioning is handled in onMouseDown
      if (!isSafari()) return

      const pendingCaretOffset = pendingCaretOffsetRef.current
      if (pendingCaretOffset === null) return

      voidAreaCaretAppliedRef.current = true
      pendingCaretOffsetRef.current = null
      touchStartPosRef.current = null

      // Apply the pending offset after next two frames to prevent the browser from repositioning the caret incorrectly.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCaretOffset(pendingCaretOffset)
          editable.style.caretColor = ''
        })
      })
    }

    editable.addEventListener('mousedown', onMouseDown)
    editable.addEventListener('touchstart', onTouchStart)
    editable.addEventListener('touchmove', onTouchMove)
    editable.addEventListener('touchend', onTouchEnd)

    return () => {
      editable.removeEventListener('mousedown', onMouseDown)
      editable.removeEventListener('touchstart', onTouchStart)
      editable.removeEventListener('touchmove', onTouchMove)
      editable.removeEventListener('touchend', onTouchEnd)
      editable.style.caretColor = ''
      pendingCaretOffsetRef.current = null
      touchStartPosRef.current = null
      voidAreaCaretAppliedRef.current = false
    }
  }, [contentRef, editingOrOnCursor, isMulticursor, fontSize, onCaretOffset, allowDefaultSelection])

  // Resume focus if sidebar was just closed and isEditing is true.
  // Disable focus restoration on mobile until the hamburger menu & sidebar backdrop can be made to
  // produce consistent results when clicked to close the sidebar.
  useEffect(() => {
    if (!isTouch && isEditing && !showSidebar && hadSidebar) {
      contentRef.current?.focus()
    }
  }, [contentRef, hadSidebar, isEditing, showSidebar])
}

export default useEditMode
