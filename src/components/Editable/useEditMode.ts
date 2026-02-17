import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useStore } from 'react-redux'
import Path from '../../@types/Path'
import { isSafari, isTouch } from '../../browser'
import { LongPressState } from '../../constants'
import asyncFocus from '../../device/asyncFocus'
import preventAutoscroll from '../../device/preventAutoscroll'
import * as selection from '../../device/selection'
import usePrevious from '../../hooks/usePrevious'
import hasMulticursor from '../../selectors/hasMulticursor'
import equalPath from '../../util/equalPath'

/** Automatically sets the selection on the given contentRef element when the thought should be selected. Handles a variety of conditions that determine whether this should occur. */
const useEditMode = ({
  contentRef,
  isEditing,
  path,
  style,
  transient,
}: {
  // expect all arguments to be passed, even if undefined
  // otherwise the hook will not be able to determine all conditions
  contentRef: React.RefObject<HTMLInputElement | null>
  isEditing: boolean
  path: Path
  style: React.CSSProperties | undefined
  transient: boolean | undefined
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
  const hadSidebar = usePrevious(showSidebar)
  const store = useStore()

  // focus on the ContentEditable element if editing or on desktop
  const editMode = !isTouch || editing

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

  // Resume focus if sidebar was just closed and isEditing is true.
  // Disable focus restoration on mobile until the hamburger menu & sidebar backdrop can be made to
  // produce consistent results when clicked to close the sidebar.
  useEffect(() => {
    if (!isTouch && isEditing && !showSidebar && hadSidebar) {
      contentRef.current?.focus()
    }
  }, [contentRef, hadSidebar, isEditing, showSidebar])

  return allowDefaultSelection
}

export default useEditMode
