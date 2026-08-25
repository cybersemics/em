import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useStore } from 'react-redux'
import { useDispatch } from 'react-redux'
import Path from '../../@types/Path'
import { setCursorActionCreator as setCursor } from '../../actions/setCursor'
import { isMac, isSafari, isTouch } from '../../browser'
import { LongPressState } from '../../constants'
import asyncFocus from '../../device/asyncFocus'
import getCaretOffset from '../../device/getCaretOffset'
import preventAutoscroll, { preventAutoscrollEnd } from '../../device/preventAutoscroll'
import * as selection from '../../device/selection'
import virtualKeyboard from '../../device/virtual-keyboard'
import globals from '../../globals'
import usePrevious from '../../hooks/usePrevious'
import hasMulticursor from '../../selectors/hasMulticursor'
import isMultiEditing from '../../selectors/isMultiEditing'
import isMulticursorPath from '../../selectors/isMulticursorPath'
import equalPath from '../../util/equalPath'
import head from '../../util/head'

// #4173: Ghost-click suppression state. On a rapid tap between adjacent thoughts, iOS Safari coalesces the
// two taps into a double-tap and emits a delayed, retargeted synthesized mousedown/click/dblclick on the
// previously-focused thought ~50-250ms after the second tap's touchend. That delayed mousedown would drive
// onMouseDown -> setCursor and yank the cursor back. We record the last real touchend (time + element); a
// genuine mousedown follows its own touchend within a few ms on the same element, whereas the ghost arrives
// later on a different thought, so it can be detected and dropped.
let lastTouchEndTime = 0
let lastTouchEndTarget: EventTarget | null = null
const GHOST_MOUSE_WINDOW_MS = 700

// #3276: Timestamp of the most recent touch on any editable. The iOS keyboard trackpad moves the browser
// selection without generating a single touch event in the page, so a selection change with no recent touch
// behind it was not made by the user.
let lastTouchTime = 0

/**
 * Returns true if the last real touchend recently (within GHOST_MOUSE_WINDOW_MS) landed on a DIFFERENT
 * editable than `editable` — the shared signature of iOS's rapid-tap retargeting (#4173). Reads the last
 * recorded touchend from module state.
 */
const isRetargetedTap = (editable: EventTarget): boolean =>
  !!lastTouchEndTarget &&
  lastTouchEndTarget !== editable &&
  performance.now() - lastTouchEndTime < GHOST_MOUSE_WINDOW_MS

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
  const isCursorCleared = useSelector(state => state.cursorCleared)
  const wasCursorCleared = usePrevious(isCursorCleared)
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
  const pressingRef = useRef(false)
  // Offset to put the caret back to when the trackpad drags the selection out of the cursor thought (#3276).
  const restoreOffsetRef = useRef(0)

  // focus on the ContentEditable element if editing or on desktop
  const editMode = !isTouch || editing
  const editingOrOnCursor = isCursor || editing

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
          // Neither the Android WebView nor Chromium raises the virtual keyboard when a thought enters edit
          // mode by side effect, e.g. via a gesture such as Clear Thought (#4686): the keyboard is raised by a
          // tap, not by the caret being placed programmatically. Request it before setting the selection,
          // which focuses the editing host implicitly and would make a later focus() a no-op.
          // Only show it in edit mode, otherwise the keyboard would re-open after the user dismissed it (#3996).
          if (editMode && contentRef.current) {
            virtualKeyboard.show(contentRef.current)
          }

          // selection.set focuses the editing host only implicitly, i.e. only when nothing else holds the focus,
          // and asyncFocus parks it on a hidden input. After a drag-and-drop the selection is cleared, so Clear
          // Thought left the editable unfocused with no caret, faux caret or keyboard (#4519). Only on the
          // transition into the cleared state; focusing on any other run blurs the previously focused editable
          // before the selection is set, which recomputes the cursor offset and ends the editing session.
          if (isCursorCleared && wasCursorCleared === false && contentRef.current) {
            contentRef.current.focus()
          }

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
          // Normally the selection is not set while a multiselection is active. However, when clearing multiple
          // thoughts, the caret must be placed on the first (cursor) thought so the user can type. Only the cursor
          // thought reaches this point (guarded by isEditing above); the other cleared thoughts show a faux caret.
          (!isMulticursor || isCursorCleared) &&
          !dragHold &&
          !dragInProgress &&
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

        If the last action is a swap, set the selection synchronously to keep the focus stable after the swap.
      */
        if (
          isTouch &&
          isSafari() &&
          lastUndoableActionType !== 'swapParent' &&
          lastUndoableActionType !== 'swapGrandparent' &&
          !selection.isThought()
        ) {
          asyncFocus()

          // asyncFocus parks the focus on its dummy input so that the programmatic selection below is honored.
          // Setting the browser selection focuses the editing host implicitly only when nothing else holds the focus,
          // so the editable has to take it back explicitly. Otherwise the focus stays stranded on the dummy input:
          // WKWebView never raises the keyboard for the editable, no caret renders, and document.hasFocus() stays
          // false, which trips the page lifecycle handler in initEvents into clearing the selection 10ms later and
          // dismissing the keyboard. Reached whenever the caret is placed with no prior selection on a thought, e.g.
          // creating a thought after an undo cleared the selection (#4692).
          // Not in the cleared state, which setSelectionToCursorOffset focuses itself on the transition into it
          // (#4519). Focusing on its later runs would leave the editable focused for the next run's asyncFocus to
          // blur, which ends the editing session and closes the keyboard mid-edit.
          if (!isCursorCleared) contentRef.current?.focus()
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
      // update selection when entering the cleared state so the caret is placed on the first thought of a multiselection
      isCursorCleared,
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
    const setCaretOffset = (
      offset: number,
      { cursorHistoryClear, preserveMulticursor }: { cursorHistoryClear?: boolean; preserveMulticursor?: boolean } = {},
    ) => {
      selection.set(editable, { offset })
      dispatch(setCursor({ path, offset, cursorHistoryClear, preserveMulticursor }))
    }

    /** Marks the beginning of a touch so that onMouseDown can determine whether a long press is occurring. */
    const onTouchStart = () => {
      pressingRef.current = true
      lastTouchTime = performance.now()
    }

    /** Ends the touch, records it for ghost-click detection, and sets the cursor on the tapped thought. */
    const onTouchEnd = (e: TouchEvent) => {
      pressingRef.current = false
      // Evaluate against the PREVIOUS touchend before overwriting it below.
      const willRetarget = isRetargetedTap(editable)
      lastTouchEndTime = performance.now()
      lastTouchTime = lastTouchEndTime
      lastTouchEndTarget = editable

      // #4173: touchend is the only event iOS reliably delivers to the tapped thought — on a rapid tap it
      // retargets the synthesized mousedown/focus to the previously-focused thought (onMouseDown suppresses
      // that ghost), so onFocus cannot be relied on to move the cursor. Set the cursor here.
      dispatch((dispatch, getState) => {
        const state = getState()
        const move =
          willRetarget &&
          state.isKeyboardOpen &&
          !equalPath(state.cursor, path) &&
          !hasMulticursor(state) &&
          state.longPress === LongPressState.Inactive &&
          style?.visibility !== 'hidden'
        if (!move) return

        // Place the caret where the user tapped. getCaretOffset is coordinate-based, so it resolves the offset
        // even though the synthesized mousedown/focus retargeted away.
        const { offset } = getCaretOffset(editable, {
          clientX: e.changedTouches[0].clientX,
          clientY: e.changedTouches[0].clientY,
        })

        // Dispatch only the Redux cursor; the declarative selection effect places the caret on the next render.
        // Calling selection.set() synchronously during touchend triggers iOS's text-selection machinery, which
        // swallows the immediately-following rapid tap.
        dispatch(
          setCursor({
            path,
            offset,
            cursorHistoryClear: true,
            isKeyboardOpen: true,
            preserveMulticursor: true,
          }),
        )
      })
    }

    /**
     * Handles the mousedown event for the editable element.
     * Prevents focus on non-cursor thoughts or during multiselect clicks.
     * When editing or cursor is present (and multicursor is not active), computes the caret position manually so that it can be set on mouseup.
     * Prevents default behavior and manages autoscroll for certain edge cases where browser selection would be incorrect.
     */
    const onMouseDown = (e: MouseEvent) => {
      // If CMD/CTRL is pressed, don't focus the editable.
      const isMultiselectClick = isMac ? e.metaKey : e.ctrlKey
      if (isMultiselectClick) {
        e.preventDefault()
        return
      }

      // If the press is ongoing (touchend has not been dispatched) then a long press is ongoing and setCaretOffset will interfere
      // with default iOS Safari drag-and-drop text selection.
      if (pressingRef.current) return

      // #4173: Suppress WebKit's delayed retargeted ghost mouse events. On a rapid tap between adjacent
      // thoughts, iOS emits a delayed mousedown/click/dblclick on the previously-focused thought after the
      // second tap already moved focus. A genuine mousedown follows its own touchend within a few ms on the
      // same element; a ghost arrives later on a different thought. Dropping it (preventDefault also blocks
      // the focus change) keeps the cursor on the thought the user actually tapped.
      if (isTouch && isSafari() && isRetargetedTap(editable)) {
        e.preventDefault()
        return
      }

      // While a multiselection is being edited (Clear Thought), a tap moves the caret as usual. The multiselection is
      // preserved when the tapped thought belongs to it, so that edits keep mirroring to the other selected thoughts.
      const state = store.getState()
      const multiEditing = isMultiEditing(state)
      const preserveMulticursor = multiEditing && isMulticursorPath(state, path)

      // Suppress the synthesized mousedown that iOS Safari can emit for a tap whose touchend already moved
      // the cursor without entering edit mode (see globals.suppressFocusAfterCursorMove). The cursor move
      // re-rendered this thought with editingOrOnCursor true before the mousedown arrived, so the branch
      // below would place the caret and refocus the editable as if this were a second tap.
      if (isTouch && isSafari() && globals.suppressFocusAfterCursorMove) {
        e.preventDefault()
        return
      }

      // If editing or the cursor is on the thought, allow the default browser selection or perform manual caret positioning so the offset is correct.
      // See: #981
      if (editingOrOnCursor && (!isMulticursor || multiEditing)) {
        const { inVoidArea, offset } = getCaretOffset(editable, {
          clientX: e.clientX,
          clientY: e.clientY,
        })

        if (offset !== null) {
          // Prevent the browser from autoscrolling to this editable element.
          // For some reason doesn't work on touchend.
          preventAutoscroll(editable, {
            // about the height of a single-line thought
            bottomMargin: fontSize * 2,
          })

          // Setting the caret offset will activate the declarative shouldSetSelection effect, which will call preventAutoscroll and selection.set
          // all over again. Since the selection is managed imperatively in this handler, this duplicate behavior is undesirable.
          allowDefaultSelection()
          setCaretOffset(offset, { preserveMulticursor })

          // It's important to avoid preventDefault when the tap is somewhere that can be handled by native browser selection behavior.
          // If the tap is prevented, it will interfere with functionality like double tap or the context menu. If the selection is
          // truly in a void area, then preventDefault will stop the caret from being placed on the wrong thought.
          if (inVoidArea) {
            e.preventDefault()
          }
        }
      } else {
        // There are areas on the outside edge of the thought that will fail to trigger onTouchEnd.
        // In those cases, it is best to prevent onFocus or onClick, otherwise keyboard is open will be incorrectly activated.
        // Steps to Reproduce: https://github.com/cybersemics/em/pull/2948#issuecomment-2887186117
        // Explanation and demo: https://github.com/cybersemics/em/pull/2948#issuecomment-2887803425
        e.preventDefault()
      }
    }

    /** Prevents the thought from autoscrolling to the bottom of the screen when the keyboard is open.
     * Autoscroll must be prevented until focus handling is complete, so preventAutoscrollEnd is deferred
     * using queueMicrotask without introducing any additional delay.
     */
    const onFocus = () => queueMicrotask(() => preventAutoscrollEnd(editable))

    // The restore below is synchronous so that the stray position never reaches a paint, but a browser that
    // refuses to move the selection back would then ping-pong forever. Cap the attempts per frame instead.
    const MAX_RESTORES_PER_FRAME = 3
    let restoresThisFrame = 0
    let resetFrame: number | null = null

    /**
     * Keeps the caret inside the cursor thought while the keyboard is open. The iOS keyboard trackpad drags the
     * browser selection out of the editing host by hit-testing the whole document; unlike a tap it never moves
     * the focus, so the editable is left focused with the caret stranded in another thought, and the keyboard
     * stays up while typing goes nowhere. Restoring only while this editable still holds the focus is what
     * distinguishes that from the many flows that legitimately move the selection away after blurring it
     * (selection.clear, the Command Center, drag start). (#3276).
     */
    const onSelectionChange = () => {
      if (document.activeElement !== editable || !isCursor || !editing || noteFocus) return

      // A tap moves the selection on purpose, including into a different thought, which is then made the cursor.
      if (performance.now() - lastTouchTime < GHOST_MOUSE_WINDOW_MS) return

      if (selection.isOnEditable(head(path))) {
        restoreOffsetRef.current = selection.offsetThought() ?? restoreOffsetRef.current
        return
      }

      if (restoresThisFrame >= MAX_RESTORES_PER_FRAME) return
      restoresThisFrame++
      resetFrame ??= requestAnimationFrame(() => {
        resetFrame = null
        restoresThisFrame = 0
      })

      // selectionchange is queued rather than dispatched synchronously, so this cannot recurse.
      selection.set(editable, { offset: restoreOffsetRef.current })
    }

    editable.addEventListener('mousedown', onMouseDown)
    if (isTouch && isSafari()) {
      editable.addEventListener('touchstart', onTouchStart)
      editable.addEventListener('touchend', onTouchEnd)
      editable.addEventListener('focus', onFocus)
      document.addEventListener('selectionchange', onSelectionChange)
    }

    return () => {
      editable.removeEventListener('mousedown', onMouseDown)
      if (isTouch && isSafari()) {
        editable.removeEventListener('touchstart', onTouchStart)
        editable.removeEventListener('touchend', onTouchEnd)
        editable.removeEventListener('focus', onFocus)
        document.removeEventListener('selectionchange', onSelectionChange)
        if (resetFrame !== null) cancelAnimationFrame(resetFrame)
      }
    }
  }, [
    noteFocus,
    contentRef,
    editing,
    editingOrOnCursor,
    isCursor,
    isMulticursor,
    fontSize,
    allowDefaultSelection,
    path,
    dispatch,
    store,
    style?.visibility,
  ])

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
