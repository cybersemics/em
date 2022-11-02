import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../../@types/Path'
import State from '../../@types/State'
import editingAction from '../../action-creators/editing'
import { isSafari, isTouch } from '../../browser'
import asyncFocus from '../../device/asyncFocus'
import * as selection from '../../device/selection'
import { store } from '../../store'
import equalPath from '../../util/equalPath'

/** Automatically sets the selection on the given contentRef element when the thought should be selected. Handles a variety of conditions that determine whether this should occur. */
const useEditMode = ({
  contentRef,
  disabled,
  isEditing,
  path,
  style,
  transient,
}: {
  // expect all arguments to be passed, even if undefined
  // otherwise the hook will not be able to determine all conditions
  contentRef: React.RefObject<HTMLInputElement>
  disabled?: boolean
  isEditing: boolean | undefined
  path: Path
  style: React.CSSProperties | undefined
  transient: boolean | undefined
}) => {
  // must re-render when noteFocus changes in order to set the selection
  const hasNoteFocus = useSelector((state: State) => state.noteFocus && equalPath(state.cursor, path))
  const editing = useSelector((state: State) => state.editing)
  const dispatch = useDispatch()
  const noteFocus = useSelector((state: State) => state.noteFocus)
  const editingCursorOffset = useSelector((state: State) => isEditing && state.cursorOffset)
  const dragHold = useSelector((state: State) => state.dragHold)
  const dragInProgress = useSelector((state: State) => state.dragInProgress)

  // focus on the ContentEditable element if editing os on desktop
  const editMode = !isTouch || editing

  useEffect(() => {
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

    // if the selection is at the beginning of the thought, ignore cursorWithoutSelection and allow the selection to be set
    // otherwise clicking on empty space to activate cursorBack will not set the selection properly on desktop
    // disable on mobile to avoid infinite loop (#908)
    const isAtBeginning = !isTouch && selection.offset() === 0

    // allow transient editable to have focus on render
    const shouldSetSelection =
      transient ||
      (isEditing &&
        editMode &&
        !noteFocus &&
        contentRef.current &&
        (cursorWithoutSelection || isAtBeginning) &&
        !dragHold &&
        !disabled)

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
    //     if (!(cursorWithoutSelection || isAtBeginning)) console.info('  cursorWithoutSelection || isAtBeginning')
    //     if (dragHold) console.info('  !dragHold')
    //     if (disabled) console.info('  !disabled')
    //   }
    // }

    if (shouldSetSelection) {
      /*
        When a new thought is created, the Shift key should be on when Auto-Capitalization is enabled.
        On Mobile Safari, Auto-Capitalization is broken if the selection is set synchronously (#999).
        Only breaks on Enter or Backspace, not gesture. Even stranger, the issue only showed up when newThought was converted to a reducer (ecc3b3be).
        For some reason, setTimeout fixes it.
      */
      if (isTouch && isSafari()) {
        asyncFocus()
        setTimeout(setSelectionToCursorOffset)
      } else {
        setSelectionToCursorOffset()
      }
    }
  }, [isEditing, editingCursorOffset, hasNoteFocus, dragInProgress, editing, transient])

  useEffect(() => {
    // Set editing to false after unmount
    return () => {
      const { cursor, editing } = store.getState()
      if (editing && equalPath(cursor, path)) {
        dispatch(editingAction({ value: false }))
      }
    }
  }, [])
}

export default useEditMode
