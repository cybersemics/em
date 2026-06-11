import React, { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useStore } from 'react-redux'
import { useDispatch } from 'react-redux'
import Path from '../../@types/Path'
import { setCursorActionCreator as setCursor } from '../../actions/setCursor'
import { isMac, isTouch } from '../../browser'
import { LongPressState } from '../../constants'
import focusWithoutAutoscroll from '../../device/focusWithoutAutoscroll'
import getCaretOffset from '../../device/getCaretOffset'
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
  const isCursor = useSelector(state => equalPath(path, state.cursor))
  const hadSidebar = usePrevious(showSidebar)
  const store = useStore()
  const dispatch = useDispatch()

  // focus on the ContentEditable element if editing or on desktop
  const editMode = !isTouch || editing
  const editingOrOnCursor = isCursor || editing

  useEffect(
    () => {
      // Get the cursorOffset directly from the store rather than subscribing to it reactively with useSelector.
      // Otherwise, it will try to set the selection while typing.
      const { cursorOffset } = store.getState()

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

      if (!shouldSetSelection) return

      // do not set the selection on hidden thoughts, otherwise it will cause a faulty focus event when switching windows
      // https://github.com/cybersemics/em/issues/1596
      if (style?.visibility === 'hidden') {
        selection.clear()
        return
      }

      // Chokepoint for all programmatic cursor changes — Return-new-thought, arrow keys (incl.
      // bluetooth on iPad), gestures, sidebar restore. focusWithoutAutoscroll focuses, places the
      // caret, and suppresses the native focus + selection autoscroll that would otherwise jolt
      // `position: fixed` elements on iOS (#3765).
      focusWithoutAutoscroll(contentRef.current, { offset: cursorOffset ?? 0 })
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

  // Handles the caret positioning logic for the editable element.
  useEffect(() => {
    const editable = contentRef.current
    if (!editable) return

    /**
     * Handles the mousedown event for the editable element.
     * Prevents focus on non-cursor thoughts or during multiselect clicks.
     * When editing or cursor is present (and multicursor is not active), computes the caret position manually and routes through focusWithoutAutoscroll so the iOS native autoscroll never fires.
     */
    const onMouseDown = (e: MouseEvent) => {
      // If CMD/CTRL is pressed, don't focus the editable.
      const isMultiselectClick = isMac ? e.metaKey : e.ctrlKey
      if (isMultiselectClick) {
        e.preventDefault()
        return
      }

      // If editing or the cursor is on the thought, perform manual caret positioning so the offset is correct.
      // See: #981
      if (editingOrOnCursor && !isMulticursor) {
        // All cursor changes (taps, Return, arrow keys, gestures) converge on
        // `focusWithoutAutoscroll`. Mousedown calls it inline here, synchronously within the
        // user gesture, so:
        //   - iOS Safari accepts the focus (no asyncFocus dance needed for the tap path).
        //   - Same-thought re-taps reposition the caret (cursorOffset is not a useEffect dep,
        //     so we cannot rely on the cursor-change useEffect for offset-only changes).
        // The cursor-change useEffect also calls focusWithoutAutoscroll for programmatic paths;
        // the function is idempotent so the second call is a no-op.
        const { offset } = getCaretOffset(editable, {
          clientX: e.clientX,
          clientY: e.clientY,
        })

        // Block the native focus + native caret-from-tap before they fire.
        e.preventDefault()

        // getCaretOffset returns null for empty thoughts (no text nodes). We still need to take
        // focus on those — otherwise tapping an empty thought that is already the cursor leaves
        // it unfocused and the keyboard never opens.
        const targetOffset = offset ?? 0

        // Dispatch setCursor first so Editable.onFocus's setCursorOnThought sees
        // state.cursor === path and early-returns instead of clobbering cursorOffset to 0.
        dispatch(
          setCursor({
            path,
            offset: targetOffset,
            isKeyboardOpen: true,
            cursorHistoryClear: true,
            preserveMulticursor: true,
          }),
        )

        focusWithoutAutoscroll(editable, { offset: targetOffset })
      } else {
        // There are areas on the outside edge of the thought that will fail to trigger onTouchEnd.
        // In those cases, it is best to prevent onFocus or onClick, otherwise keyboard is open will be incorrectly activated.
        // Steps to Reproduce: https://github.com/cybersemics/em/pull/2948#issuecomment-2887186117
        // Explanation and demo: https://github.com/cybersemics/em/pull/2948#issuecomment-2887803425
        e.preventDefault()
      }
    }

    editable.addEventListener('mousedown', onMouseDown)
    return () => {
      editable.removeEventListener('mousedown', onMouseDown)
    }
  }, [contentRef, editingOrOnCursor, isMulticursor, path, dispatch])

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
