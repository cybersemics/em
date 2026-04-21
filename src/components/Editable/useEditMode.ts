import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useStore } from 'react-redux'
import Path from '../../@types/Path'
import { isMac, isSafari, isTouch } from '../../browser'
import { LongPressState } from '../../constants'
import asyncFocus from '../../device/asyncFocus'
import preventAutoscroll, { preventAutoscrollEnd } from '../../device/preventAutoscroll'
import * as selection from '../../device/selection'
import usePrevious from '../../hooks/usePrevious'
import hasMulticursor from '../../selectors/hasMulticursor'
import equalPath from '../../util/equalPath'
import getCaretOffset from '../../util/getCaretOffset'

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
  /** Called when the caret offset is set, allowing the caller to update Redux cursor state. */
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

  /** Prevents `getCaretOffset` from running twice on touch devices (onMousedown after onTouchEnd). */
  const pendingCaretHandledRef = useRef(false)

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

  // Handles the caret positioning logic for the editable element.
  useEffect(() => {
    const editable = contentRef.current
    if (!editable) return

    /** Sets the DOM selection and notifies the caller to update Redux cursor state. */
    const setCaretOffset = (nodeOffset: number) => {
      selection.set(editable, { offset: nodeOffset })
      onCaretOffset(nodeOffset)
    }

    /**
     * Handles the mousedown event for the editable element.
     * Prevents focus on non-cursor thoughts or during multiselect clicks.
     * When editing or cursor is present (and multicursor is not active), computes and sets the caret position manually.
     * Prevents default behavior and manages autoscroll for certain edge cases where browser selection would be incorrect.
     */
    const onMouseDown = (e: MouseEvent) => {
      // If CMD/CTRL is pressed, don't focus the editable.
      const isMultiselectClick = isMac ? e.metaKey : e.ctrlKey
      if (isMultiselectClick) {
        e.preventDefault()
        return
      }

      // If editing or the cursor is on the thought, allow the default browser selection or perform manual caret positioning so the offset is correct.
      // See: #981
      if (editingOrOnCursor && !isMulticursor) {
        // Prevent the browser from autoscrolling to this editable element.
        // For some reason doesn't work on touchend.
        preventAutoscroll(editable, {
          // about the height of a single-line thought
          bottomMargin: fontSize * 2,
        })

        // If the caret was already applied (i.e. onTouchEnd), exit early so that we do not perform the computation again.
        if (pendingCaretHandledRef.current) {
          pendingCaretHandledRef.current = false
          return
        }

        const { inVoidArea, offset: nodeOffset } = getCaretOffset(editable, {
          clientX: e.clientX,
          clientY: e.clientY,
        })

        if (nodeOffset !== null) {
          // do not prevent default if the tap is on a valid character bounding box.
          // this preserves native browser behavior for text selection.
          if (inVoidArea) {
            e.preventDefault()
          }
          setCaretOffset(nodeOffset)
        } else {
          allowDefaultSelection()
        }
      } else {
        // There are areas on the outside edge of the thought that will fail to trigger onTouchEnd.
        // In those cases, it is best to prevent onFocus or onClick, otherwise keyboard is open will be incorrectly activated.
        // Steps to Reproduce: https://github.com/cybersemics/em/pull/2948#issuecomment-2887186117
        // Explanation and demo: https://github.com/cybersemics/em/pull/2948#issuecomment-2887803425
        e.preventDefault()
      }
    }

    /** Prevents the thought from autoscrolling to the bottom of the screen when the keyboard is open. */
    const onFocus = () => preventAutoscrollEnd(editable)

    editable.addEventListener('mousedown', onMouseDown)
    editable.addEventListener('focus', onFocus)

    return () => {
      editable.removeEventListener('mousedown', onMouseDown)
      editable.removeEventListener('focus', onFocus)
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
