import React, { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../../@types/Path'
import { editingActionCreator as editingAction } from '../../actions/editing'
import { isSafari, isTouch } from '../../browser'
import asyncFocus from '../../device/asyncFocus'
import preventAutoscroll from '../../device/preventAutoscroll'
import * as selection from '../../device/selection'
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
  contentRef: React.RefObject<HTMLInputElement>
  isEditing: boolean | undefined
  path: Path
  style: React.CSSProperties | undefined
  transient: boolean | undefined
}) => {
  // must re-render when noteFocus changes in order to set the selection
  const hasNoteFocus = useSelector(state => state.noteFocus && equalPath(state.cursor, path))
  const editing = useSelector(state => state.editing)
  const dispatch = useDispatch()
  const noteFocus = useSelector(state => state.noteFocus)
  const editingCursorOffset = useSelector(state => isEditing && state.cursorOffset)
  const dragHold = useSelector(state => state.dragHold)
  const dragInProgress = useSelector(state => state.dragInProgress)
  const disabledRef = useRef(false)

  // focus on the ContentEditable element if editing os on desktop
  const editMode = !isTouch || editing

  useEffect(
    () => {
      /** Set the selection to the current Editable at the cursor offset. */
      const setSelectionToCursorOffset = () => {
        // do not set the selection on hidden thoughts, otherwise it will cause a faulty focus event when switching windows
        // https://github.com/cybersemics/em/issues/1596
        if (style?.visibility === 'hidden') {
          selection.clear()
        } else {
          selection.set(contentRef.current, { offset: editingCursorOffset || 0 })
        }
      }

      // if there is no browser selection, do not manually call selection.set as it does not preserve the cursor offset. Instead allow the default focus event.
      const cursorWithoutSelection = editingCursorOffset !== null || !selection.isActive()

      // allow transient editable to have focus on render
      const shouldSetSelection =
        transient ||
        (isEditing &&
          editMode &&
          !noteFocus &&
          contentRef.current &&
          cursorWithoutSelection &&
          !dragHold &&
          !disabledRef.current)

      /* DEBUGGING
      There are many different values that determine if we set the selection.
      Use this to help debug selection issues.
    */
      // if (isEditing) {
      //   const value = headValue(store.getState(), path)
      //   if (shouldSetSelection) {
      //     console.info('Selection set on', value, editingCursorOffset)
      //   } else {
      //     console.info('These values are false, preventing the selection from being set on', value)
      //     if (!editMode) console.info('  editMode')
      //     if (!contentRef.current) console.info('  contentRef.current')
      //     if (noteFocus) console.info('  - !noteFocus')
      //     if (!(cursorWithoutSelection)) console.info('  cursorWithoutSelection')
      //     if (dragHold) console.info('  !dragHold')
      //     if (disabledRef.current) console.info('  !disabledRef.current')
      //   }
      // }

      if (shouldSetSelection) {
        preventAutoscroll(contentRef.current)

        /*
        When a new thought is created, the Shift key should be on when Auto-Capitalization is enabled.
        On Mobile Safari, Auto-Capitalization is broken if the selection is set synchronously (#999).
        Only breaks on Enter or Backspace, not gesture.

        setTimeout fixes it, however it introduces an infinite loop when a nested empty thought is created.
        Not calling asyncFocus when the selection is already on a thought prevents the infinite loop.
      */
        if (isTouch && isSafari()) {
          if (!selection.isThought()) {
            asyncFocus()
          }
          setTimeout(setSelectionToCursorOffset)
        } else {
          setSelectionToCursorOffset()
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditing, editingCursorOffset, hasNoteFocus, dragInProgress, editing, transient],
  )

  useEffect(
    () => {
      // Set editing to false after unmount
      return () => {
        dispatch((dispatch, getState) => {
          const { cursor, editing } = getState()
          if (editing && equalPath(cursor, path)) {
            dispatch(editingAction({ value: false }))
          }
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Provide an escape hatch to allow the next default selection rather than setting it.
  // This allows the user to set the selection in the middle of a non-cursor thought when in edit mode.
  // Otherwise the caret is moved to the beginning of the thought.
  const allowDefaultSelection = useCallback(() => {
    disabledRef.current = true
    // enable on next tick, which is long enough to skip the next setSelectionToCursorOffset
    setTimeout(() => {
      disabledRef.current = false
    })
  }, [])

  return allowDefaultSelection
}

export default useEditMode
