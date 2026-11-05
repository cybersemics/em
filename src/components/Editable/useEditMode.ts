import React, { useCallback, useEffect, useReducer, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useStore } from 'react-redux'
import { useDispatch } from 'react-redux'
import Path from '../../@types/Path'
import State from '../../@types/State'
import { isSafari, isTouch } from '../../browser'
import { LongPressState } from '../../constants'
import asyncFocus from '../../device/asyncFocus'
import getCaretOffset from '../../device/getCaretOffset'
import preventAutoscroll, { preventAutoscrollEnd } from '../../device/preventAutoscroll'
import * as selection from '../../device/selection'
import virtualKeyboard from '../../device/virtual-keyboard'
import useFreshCallback from '../../hooks/useFreshCallback'
import usePrevious from '../../hooks/usePrevious'
import hasMulticursor from '../../selectors/hasMulticursor'
import isMultiEditing from '../../selectors/isMultiEditing'
import multitouchStore from '../../stores/multitouchStore'
import osVersionStore from '../../stores/osVersionStore'
import touchStore from '../../stores/touchStore'
import debugLog from '../../util/debugLog'
import equalPath from '../../util/equalPath'
import head from '../../util/head'
import isCommandKey from '../../util/isCommandKey'
import lastTouch from './lastTouch'
import useCaretRestore from './useCaretRestore'
import useRevertCorrection from './useRevertCorrection'

/** Automatically sets the selection on the given contentRef element when the thought should be selected. Handles a variety of conditions that determine whether this should occur. */
const useEditMode = ({
  contentRef,
  isEditing,
  path,
  setCursorForTap,
  style,
  transient,
}: {
  // expect all arguments to be passed, even if undefined
  // otherwise the hook will not be able to determine all conditions
  contentRef: React.RefObject<HTMLInputElement | null>
  isEditing: boolean
  path: Path
  /** Editable's setter for the cursor of a tap on this thought. The hook decides where the tap places the caret, Editable decides what the tap does to the cursor, and the selection effect places the caret from the result. */
  setCursorForTap: (options: { offset?: number }) => void
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
  // Bumped to place the caret for a tap, since the selection effect does not subscribe to cursorOffset. Subscribing
  // would move the caret on every saved edit, whose cursorOffset lags the live caret through the edit throttle, and
  // would not fire for a tap at the offset Redux already holds, such as one after the End key moved the caret without
  // writing it. A nonce changes on every tap and on nothing else.
  const [caretNonce, bumpCaretNonce] = useReducer((nonce: number) => nonce + 1, 0)
  // A run of the selection effect is placing the caret for a tap when the tap's bump of caretNonce is what it follows.
  const prevCaretNonce = usePrevious(caretNonce)
  const editableNonce = useSelector(state => state.editableNonce)
  const showSidebar = useSelector(state => state.showSidebar)
  const fontSize = useSelector(state => state.fontSize)
  const isCursor = useSelector(state => equalPath(path, state.cursor))
  const hadSidebar = usePrevious(showSidebar)
  const store = useStore()
  const dispatch = useDispatch()
  const pressingRef = useRef(false)
  // Where the touch in progress on this editable began.
  const touchStartRef = useRef<{ clientX: number; clientY: number } | null>(null)

  // focus on the ContentEditable element if editing or on desktop
  const editMode = !isTouch || editing
  const editingOrOnCursor = isCursor || editing

  /** Records the offset of a tap in the Redux cursor state, through Editable's setCursorForTap, which flushes the edit throttle first and applies what a tap does to the cursor. */
  // A fresh callback rather than useCallback, because useRevertCorrection keeps the tap it is watching inside an effect
  // that depends on it. setCursorForTap changes identity whenever the thought's edit state or path does, and a new
  // identity here would tear that effect down and lose the watch in the middle of a tap.
  const recordCaretOffset = useFreshCallback(
    (offset: number) => {
      setCursorForTap({ offset })
    },
    [setCursorForTap],
  )

  /** Records the offset of a tap and has the selection effect place the caret there. */
  const setCaretOffset = useCallback(
    (offset: number) => {
      recordCaretOffset(offset)
      bumpCaretNonce()
    },
    [recordCaretOffset],
  )

  useCaretRestore({ editableRef: contentRef, enabled: isCursor && !!editing })
  useRevertCorrection({ editableRef: contentRef, enabled: isCursor && !!editing, recordCaretOffset })

  useEffect(
    () => {
      // Get the cursorOffset directly from the store rather than subscribing to it reactively with useSelector.
      // Otherwise, it will try to set the selection while typing.
      const { cursorOffset, lastUndoableActionType } = store.getState()
      // onMouseDown has already decided that this tap places the caret, so the conditions below for a placement made
      // by side effect do not apply to it.
      const isTapPlacement = prevCaretNonce !== undefined && caretNonce !== prevCaretNonce

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
        isTapPlacement ||
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
          !dragInProgress)

      if (shouldSetSelection) {
        const shouldAsyncFocus =
          isTouch &&
          isSafari() &&
          lastUndoableActionType !== 'swapParent' &&
          lastUndoableActionType !== 'swapGrandparent' &&
          !selection.isThought()

        // Record each programmatic caret placement, which happens without a tap on Enter, gestures and undo, and is
        // what makes iOS scroll the focused editable into view.
        debugLog.log('caret', () => ({
          thoughtId: head(path),
          offset: cursorOffset,
          asyncFocus: shouldAsyncFocus,
          transient: !!transient,
          hidden: style?.visibility === 'hidden',
        }))

        // The one call per placement, a tap's included: it runs in the same task as the tap's mousedown, before the
        // browser moves the focus. A tap leaves about a line, the height of a single-line thought, between the tapped
        // thought and the keyboard.
        preventAutoscroll(contentRef.current, isTapPlacement ? { bottomMargin: fontSize * 2 } : undefined)

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
        if (shouldAsyncFocus) {
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
    // React Hook useEffect has missing dependencies: 'contentRef', 'editMode', 'prevCaretNonce', and 'style?.visibility'.
    // prevCaretNonce is read only to tell whether this run follows a tap's bump of caretNonce. As a dependency it would
    // run the effect again on the render after a tap, as a placement made by side effect, which puts the caret back at
    // cursorOffset after a move that did not write it, such as the End key.
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
      caretNonce,
      store,
      transient,
    ],
  )

  // Handles the caret positioning logic for the editable element.
  useEffect(() => {
    const editable = contentRef.current
    if (!editable) return

    /** Marks the beginning of a touch so that onMouseDown can determine whether a long press is occurring. */
    const onTouchStart = (e: TouchEvent) => {
      pressingRef.current = true
      const touch = e.touches[0]
      touchStartRef.current = touch ? { clientX: touch.clientX, clientY: touch.clientY } : null
    }

    /** Whether a tap on this thought may move the cursor onto it while the keyboard is open on another thought. */
    const canTapMoveCursor = (state: State) =>
      state.isKeyboardOpen &&
      !equalPath(state.cursor, path) &&
      !hasMulticursor(state) &&
      !touchStore.getState().suppressCursorAfterTouch &&
      state.longPress === LongPressState.Inactive &&
      // Do not move the cursor when the tap is part of a multi-touch gesture (e.g. pinch or two-finger
      // trace): the caret must stay where it was. The latch persists through the terminating touchend of
      // the gesture and resets on the next single-finger touchstart. See #4233.
      !multitouchStore.getState() &&
      style?.visibility !== 'hidden'

    /** Ends the touch, records it for ghost-click detection, and sets the cursor on the tapped thought. */
    const onTouchEnd = (e: TouchEvent) => {
      pressingRef.current = false
      // Evaluate against the PREVIOUS touchend before overwriting it below.
      const willRetarget = lastTouch.isRetargeted(editable)
      lastTouch.record(editable)
      // #4173: touchend is the only event iOS reliably delivers to the tapped thought — on a rapid tap it
      // retargets the synthesized mousedown/focus to the previously-focused thought (onMouseDown suppresses
      // that ghost), so onFocus cannot be relied on to move the cursor. Set the cursor here.
      dispatch((dispatch, getState) => {
        const state = getState()
        if (!willRetarget || !canTapMoveCursor(state)) return

        // Place the caret where the user tapped. getCaretOffset is coordinate-based, so it resolves the offset
        // even though the synthesized mousedown/focus retargeted away.
        const { offset } = getCaretOffset(editable, {
          clientX: e.changedTouches[0].clientX,
          clientY: e.changedTouches[0].clientY,
        })

        // Set only the Redux cursor; the declarative selection effect places the caret on the next render.
        // Calling selection.set() synchronously during touchend triggers iOS's text-selection machinery, which
        // swallows the immediately-following rapid tap.
        setCursorForTap({ offset: offset ?? undefined })
      })
    }

    /**
     * Handles the mousedown event for the editable element.
     * Prevents focus on non-cursor thoughts or during multiselect clicks.
     * When editing or cursor is present (and multicursor is not active), computes the caret position manually and places it through setCaretOffset.
     * Prevents default behavior and manages autoscroll for certain edge cases where browser selection would be incorrect.
     */
    const onMouseDown = (e: MouseEvent) => {
      // If CMD/CTRL is pressed, this is a multiselect click, so don't focus the editable.
      if (isCommandKey(e)) {
        e.preventDefault()
        return
      }

      // Ignore synthesized mouse events that are part of a multi-touch gesture (e.g. pinch): the caret must
      // not move to the touch. preventDefault also blocks the native focus/caret change. See #4233.
      if (multitouchStore.getState()) {
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
      if (isTouch && isSafari() && lastTouch.isRetargeted(editable)) {
        e.preventDefault()
        return
      }

      const multiEditing = isMultiEditing(store.getState())

      // Suppress the synthesized mousedown that iOS Safari can emit for a tap whose touchend already moved
      // the cursor without entering edit mode or a completed drag (see suppressCursorAfterTouch in stores/touchStore.ts). The cursor move
      // re-rendered this thought with editingOrOnCursor true before the mousedown arrived, so the branch
      // below would place the caret and refocus the editable as if this were a second tap.
      if (isTouch && touchStore.getState().suppressCursorAfterTouch) {
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
          // The selection effect that places the caret also prevents the autoscroll.
          setCaretOffset(offset)

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
     * using queueMicrotask without introducing any additional delay. Also places the caret for a tap whose touchend
     * iOS withholds.
     */
    const onFocus = () => {
      queueMicrotask(() => preventAutoscrollEnd(editable))

      // #5761: iOS 27 can withhold a tap's touchend until the next touch, so the tap's mousedown arrives while the
      // touch still looks like a press in progress, and onMouseDown leaves the caret to the browser. The focus that
      // follows would then set the cursor without an offset, which puts the caret at the start of the thought.
      // Place it where the touch landed instead, before Editable's onFocus runs. A focus on iOS 26 and earlier
      // never arrives mid-touch, since their touchend precedes the tap's synthesized events.
      const touchStart = touchStartRef.current
      if (!pressingRef.current || !touchStart || (osVersionStore.getState() ?? 0) < 27) return

      dispatch((dispatch, getState) => {
        if (!canTapMoveCursor(getState())) return

        const { offset } = getCaretOffset(editable, touchStart)

        // Set only the Redux cursor; the declarative selection effect places the caret on the next render.
        setCursorForTap({ offset: offset ?? undefined })
      })
    }

    editable.addEventListener('mousedown', onMouseDown)
    if (isTouch && isSafari()) {
      editable.addEventListener('touchstart', onTouchStart)
      editable.addEventListener('touchend', onTouchEnd)
      editable.addEventListener('focus', onFocus)
    }

    return () => {
      editable.removeEventListener('mousedown', onMouseDown)
      if (isTouch && isSafari()) {
        editable.removeEventListener('touchstart', onTouchStart)
        editable.removeEventListener('touchend', onTouchEnd)
        editable.removeEventListener('focus', onFocus)
      }
    }
  }, [
    contentRef,
    editing,
    editingOrOnCursor,
    setCaretOffset,
    setCursorForTap,
    isCursor,
    isMulticursor,
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
