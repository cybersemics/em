import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useStore } from 'react-redux'
import { useDispatch } from 'react-redux'
import Path from '../../@types/Path'
import { setCursorActionCreator as setCursor } from '../../actions/setCursor'
import { isMac, isSafari, isTouch } from '../../browser'
import { LongPressState } from '../../constants'
import asyncFocus from '../../device/asyncFocus'
import focusWithoutAutoscroll from '../../device/focusWithoutAutoscroll'
import getCaretOffset from '../../device/getCaretOffset'
import preventAutoscroll, { preventAutoscrollEnd } from '../../device/preventAutoscroll'
import * as selection from '../../device/selection'
import usePrevious from '../../hooks/usePrevious'
import hasMulticursor from '../../selectors/hasMulticursor'
import { getAutoscrollTechnique } from '../../util/autoscrollTechnique'
import { debugLog, editableLabel, selectionSnapshot } from '../../util/debugAutoscrollLog'
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
  const fontSize = useSelector(state => state.fontSize)
  const isCursor = useSelector(state => equalPath(path, state.cursor))
  const hadSidebar = usePrevious(showSidebar)
  const store = useStore()
  const dispatch = useDispatch()
  const offsetRef = useRef<number | null>(null)

  // focus on the ContentEditable element if editing or on desktop
  const editMode = !isTouch || editing
  const editingOrOnCursor = isCursor || editing

  useEffect(
    () => {
      // Get the cursorOffset directly from the store rather than subscribing to it reactively with useSelector.
      // Otherwise, it will try to set the selection while typing.
      const { cursorOffset, lastUndoableActionType } = store.getState()
      const technique = getAutoscrollTechnique()

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

      if (technique === 'v2') {
        debugLog(
          'useEffect',
          `el=${editableLabel(contentRef.current)} cursorOffset=${cursorOffset} shouldSet=${shouldSetSelection} active=${editableLabel(document.activeElement)} ${selectionSnapshot()}`,
        )
      }

      if (!shouldSetSelection) return

      // do not set the selection on hidden thoughts, otherwise it will cause a faulty focus event when switching windows
      // https://github.com/cybersemics/em/issues/1596
      if (style?.visibility === 'hidden') {
        selection.clear()
        return
      }

      if (technique === 'v2') {
        // Chokepoint — handles focus, selection.set with autoscroll suppression, and deferred
        // scroll. This is the path for all programmatic cursor changes: Return-new-thought,
        // arrow keys (incl. bluetooth on iPad), gestures, sidebar restore.
        focusWithoutAutoscroll(contentRef.current, { offset: cursorOffset ?? 0 })
      } else {
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

        selection.set(contentRef.current, { offset: cursorOffset ?? 0 })
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

    /** Sets the DOM selection and updates the Redux cursor state. */
    const setCaretOffset = (offset: number) => {
      selection.set(editable, { offset })
      dispatch(setCursor({ path, offset }))
    }

    /**
     * Handles the mousedown event for the editable element.
     * Prevents focus on non-cursor thoughts or during multiselect clicks.
     * When editing or cursor is present (and multicursor is not active), computes the caret position manually so that it can be set on mouseup.
     * Prevents default behavior and manages autoscroll for certain edge cases where browser selection would be incorrect.
     */
    const onMouseDown = (e: MouseEvent) => {
      if (getAutoscrollTechnique() === 'v2') {
        debugLog(
          'mousedown.entry',
          `el=${editableLabel(editable)} editingOrOnCursor=${editingOrOnCursor} isMulticursor=${isMulticursor} active=${editableLabel(document.activeElement)}`,
        )
      }

      // If CMD/CTRL is pressed, don't focus the editable.
      const isMultiselectClick = isMac ? e.metaKey : e.ctrlKey
      if (isMultiselectClick) {
        e.preventDefault()
        return
      }

      // If editing or the cursor is on the thought, allow the default browser selection or perform manual caret positioning so the offset is correct.
      // See: #981
      if (editingOrOnCursor && !isMulticursor) {
        // A/B toggle for issue #3765 — see src/util/autoscrollTechnique.ts.
        const technique = getAutoscrollTechnique()

        if (technique === 'v2') {
          // v2 strategy for issue #3765. All cursor changes (taps, Return, arrow keys, gestures)
          // converge on `focusWithoutAutoscroll` — see its docstring. Mousedown calls it inline
          // here, synchronously within the user gesture, so:
          //   - iOS Safari accepts the focus (no asyncFocus dance needed for the tap path)
          //   - same-thought re-taps reposition the caret (cursorOffset is not a useEffect dep,
          //     so we cannot rely on the useEffect for offset-only changes)
          // The cursor-change useEffect also calls focusWithoutAutoscroll for programmatic
          // paths; the function is idempotent so the second call is a no-op.
          const { offset } = getCaretOffset(editable, {
            clientX: e.clientX,
            clientY: e.clientY,
          })

          debugLog(
            'mousedown',
            `el=${editableLabel(editable)} active=${editableLabel(document.activeElement)} offset=${offset}`,
          )

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
          debugLog('postFocus', `active=${editableLabel(document.activeElement)} ${selectionSnapshot()}`)
        } else {
          // v1: existing centering hack. Prevent the browser from autoscrolling to this editable element.
          // For some reason doesn't work on touchend.
          preventAutoscroll(editable, {
            // about the height of a single-line thought
            bottomMargin: fontSize * 2,
          })

          const { inVoidArea, offset } = getCaretOffset(editable, {
            clientX: e.clientX,
            clientY: e.clientY,
          })

          if (offset !== null) {
            if (isTouch && isSafari()) {
              offsetRef.current = offset
              allowDefaultSelection()
            } else {
              setCaretOffset(offset)
            }

            // It's important to avoid preventDefault when the tap is somewhere that can be handled by native browser selection behavior.
            // If the tap is prevented, it will interfere with functionality like double tap or the context menu. If the selection is
            // truly in a void area, then preventDefault will stop the caret from being placed on the wrong thought.
            if (inVoidArea) {
              e.preventDefault()
            }
          } else {
            allowDefaultSelection()
          }
        }
      } else {
        if (getAutoscrollTechnique() === 'v2') {
          debugLog('mousedown.elseBranch', `el=${editableLabel(editable)} (preventDefault, no v2 logic)`)
        }
        // There are areas on the outside edge of the thought that will fail to trigger onTouchEnd.
        // In those cases, it is best to prevent onFocus or onClick, otherwise keyboard is open will be incorrectly activated.
        // Steps to Reproduce: https://github.com/cybersemics/em/pull/2948#issuecomment-2887186117
        // Explanation and demo: https://github.com/cybersemics/em/pull/2948#issuecomment-2887803425
        e.preventDefault()
      }
    }

    /**
     * Handles the mouseup event for the editable element.
     * Preserve native drag selection behavior by deferring setCaretOffset until mouseup.
     */
    const onMouseUp = (e: MouseEvent) => {
      if (offsetRef.current !== null) {
        // Certain taps that are outside of the regular bounds of the editable element will fail to trigger onMouseUp.
        // In those cases, allowDefaultSelection will be activated in onMouseDown, which will allow the native browser
        // selection behavior to take over instead of responding to setCursor with a null offset.
        disabledRef.current = false
        setCaretOffset(offsetRef.current)
      }

      /** Prevents the thought from autoscrolling to the bottom of the screen when the keyboard is open.
       * Autoscroll must be prevented until focus handling is complete, so preventAutoscrollEnd is deferred
       * using queueMicrotask without introducing any additional delay.
       */
      queueMicrotask(() => preventAutoscrollEnd(editable))
    }

    editable.addEventListener('mousedown', onMouseDown)
    if (isTouch && isSafari()) editable.addEventListener('mouseup', onMouseUp)

    return () => {
      editable.removeEventListener('mousedown', onMouseDown)
      if (isTouch && isSafari()) editable.removeEventListener('mouseup', onMouseUp)
    }
  }, [contentRef, editingOrOnCursor, isCursor, isMulticursor, fontSize, allowDefaultSelection, path, dispatch])

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
