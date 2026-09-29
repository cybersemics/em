import _ from 'lodash'
import lifecycle from 'page-lifecycle'
import { Store } from 'redux'
import LifecycleState from '../@types/LifecycleState'
import Path from '../@types/Path'
import State from '../@types/State'
import Timer from '../@types/Timer'
import { alertActionCreator as alert } from '../actions/alert'
import { errorActionCreator as error } from '../actions/error'
import { gestureMenuActionCreator as gestureMenu } from '../actions/gestureMenu'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { isSafari, isTouch } from '../browser'
import { beforeInput, keyDown, keyUp } from '../commands'
import { AlertType, LongPressState } from '../constants'
import initKeyboardSelection from '../device/initKeyboardSelection'
import nativeHistory from '../device/nativeHistory'
import * as selection from '../device/selection'
import virtualKeyboardHandler from '../device/virtual-keyboard'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import pathExists from '../selectors/pathExists'
import store from '../stores/app'
import { updateCaretRect } from '../stores/caretRectStore'
import { updateCommandState } from '../stores/commandStateStore'
import distractionFreeTypingStore from '../stores/distractionFreeTypingStore'
import ministore from '../stores/ministore'
import multitouchStore, { updateMultitouch } from '../stores/multitouchStore'
import scrollContainerStore from '../stores/scrollContainerStore'
import { updateScrollTop } from '../stores/scrollTopStore'
import selectionRangeStore from '../stores/selectionRangeStore'
import storageModel from '../stores/storageModel'
import syncStatusStore from '../stores/syncStatusStore'
import touchStore from '../stores/touchStore'
import { updateSize } from '../stores/viewportStore'
import isRoot from '../util/isRoot'
import pathToContext from '../util/pathToContext'
import debugLog from './debugLog'
import durations from './durations'
import equalPath from './equalPath'
import storeSession from './storeSession'

// the width of the scroll-at-edge zone at the top/bottom of the screen (for vertical scrolling) or left/right of the screen (for horizontal scrolling)
const TOOLBAR_SCROLLATEDGE_SIZE = 50
const WINDOW_SCROLLATEDGE_UP_SIZE = 120
const WINDOW_SCROLLATEDGE_DOWN_SIZE = 100

// the top speed of the scroll-at-edge expressed pixels per % of scroll-at-edge zone
const TOOLBAR_SCROLLATEDGE_SPEED = 1.25
const WINDOW_SCROLLATEDGE_SPEED = 2

/** How often to save the selection offset to storage when it changes. */
const SELECTION_CHANGE_THROTTLE = 200

/** A touchstart this soon after the last touchend means that touchend was withheld until the touchstart (#5660). A lift and a new touch are never this close together, while the withheld touchend arrives within the same millisecond. */
const TOUCHEND_WITHHELD_MS = 10

/** The longest time from one touchstart to the next for the two to be a double tap. Measured on iOS 27, a pair 222ms apart was a double tap and pairs 617ms or more apart never were. Unlike the gap from the last touchend, this cannot be faked by a withheld touchend, whose arrival is delayed until the next touchstart. */
const DOUBLE_TAP_MS = 500

/** The storeSession key recording that iOS has been seen withholding a touchend. The stuck state outlives the page, so the knowledge of it has to survive a reload too (#5660). */
const TOUCHEND_WITHHELD_KEY = 'touchEndWithheld'

/** The pending selection.clear that fires if the device stays in the passive state (see onStateChange). A ministore whose dispose clears the timer, so that cleanup and a reset between tests cancel it rather than leaving it to fire later. */
const passiveTimeoutStore = ministore<{ timer: Timer | null }>(
  { timer: null },
  { dispose: ({ timer }) => clearTimeout(timer ?? undefined) },
)

/** How long after the app resumes to log the viewport geometry a second time. On iOS the viewport can finish resizing after the page is already active, such as when a keyboard that was open when the app was backgrounded is dismissed, and it may do so without firing a resize event, so a second snapshot shows where the viewport settled. */
const RESUME_SETTLE_DELAY = 1000

/** Timer for the settled viewport snapshot logged after the app resumes. A ministore whose dispose clears the timer, like passiveTimeoutStore. */
const resumeSettleTimeoutStore = ministore<{ timer: Timer | null }>(
  { timer: null },
  { dispose: ({ timer }) => clearTimeout(timer ?? undefined) },
)

/** An scroll-at-edge function that will continue scrolling smoothly in a given direction until scroll-at-edge.stop is called. Takes a number of pixels to scroll each iteration. */
const scrollAtEdge = (() => {
  /** Cubic easing function. */
  const ease = (n: number) => Math.pow(n, 3)

  // if true, the window or scroll container will continue to be scrolled at the current rate without user interaction
  let autoscrolling = true

  // scroll speed (-1 to 1)
  const rate = { x: 0, y: 0 }

  /** Scroll vertically in the direction given by rate until stop is called. Defaults to scrolling the window, or you can pass an element to scroll. */
  const scroll = () => {
    const scrollContainer = scrollContainerStore.getState().element
    const el = scrollContainer || window

    const scrollLeft = (scrollContainer as HTMLElement).scrollLeft ?? document.documentElement.scrollLeft
    const scrollLeftNew = Math.max(0, scrollLeft + rate.x)
    const scrollTop = (scrollContainer as HTMLElement).scrollTop ?? document.documentElement.scrollTop
    const scrollTopNew = Math.max(0, scrollTop + rate.y)

    // if we have hit the end, stop autoscrolling
    // i.e. if the next increment would not change scrollTop
    if (scrollLeftNew === scrollLeft && scrollTopNew === scrollTop) {
      autoscrolling = false
      return
    }

    el.scrollTo(scrollLeftNew, scrollTopNew)
    window.requestAnimationFrame(() => {
      if (autoscrolling) {
        scroll()
      }
    })
  }

  /** Starts the scroll-at-edge or, if already scrolling, updates the scroll rate (-1 to 1). */
  const start = ({ x, y }: { x?: number; y?: number }) => {
    // update the scroll rate
    if (x != null) {
      rate.x = ease(x ?? 1)
    }
    if (y != null) {
      rate.y = ease(y ?? 1)
    }

    // if already scrolling, just adjust the scroll rate and bail
    if (autoscrolling) return

    autoscrolling = true
    scroll()
  }

  /** Stops scrolling. */
  const stop = () => {
    autoscrolling = false
  }

  return { start, stop }
})()

/** Warns on close if saving is in progress. */
const onBeforeUnload = (e: BeforeUnloadEvent) => {
  const syncStatus = syncStatusStore.getState()
  if (
    syncStatus.savingProgress < 1 &&
    // do not warn user if importing, since it is resumable
    store.getState().alert?.alertType !== AlertType.ImportFile
  ) {
    // Note: Showing confirmation dialog can vary between browsers.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
    e.preventDefault()
    e.returnValue = ''
    return ''
  }
}

type EventHandlers = {
  keyDown: typeof keyDown
  keyUp: typeof keyUp
  cleanup: () => void
}

let eventHandlers: EventHandlers | null = null

/** Add window event handlers once. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initEvents = (store: Store<State, any>) => {
  if (eventHandlers) return eventHandlers

  let lastState: number
  let lastPath: Path | null

  /** Popstate event listener; setCursor on browser history forward/backward. */
  const onPopstate = (e: PopStateEvent) => {
    const state = store.getState()

    const { path, contextViews } = decodeThoughtsUrl(state)

    if (!lastPath) {
      lastPath = state.cursor
    }

    if (!path || !pathExists(state, pathToContext(state, path)) || equalPath(lastPath, path)) {
      window.history[!lastState || lastState > e.state ? 'back' : 'forward']()
    }

    lastPath = path && pathExists(state, pathToContext(state, path)) ? path : lastPath
    lastState = e.state

    const toRoot = !path || isRoot(path)

    // clear the selection if root
    if (toRoot) {
      selection.clear()
    }

    // set the cursor
    const cursor = toRoot ? null : path

    // check if path is the root, since decodeThoughtsUrl returns a rooted path rather than null
    store.dispatch(setCursor({ path: cursor, replaceContextViews: contextViews }))
  }

  /** Save selection offset to storage, throttled. */
  const saveSelectionOffset = _.throttle(
    () => {
      // editables are not long-pressable on desktop, so the range will only be a concern on mobile
      if (isTouch) selectionRangeStore.update(!selection.isCollapsed())
      storageModel.set('cursor', value => ({
        path: value?.path || store.getState().cursor,
        offset: selection.offsetThought(),
      }))
    },
    SELECTION_CHANGE_THROTTLE,
    { leading: false },
  )

  /** Selection change event listener; save selection offset to storage, update command state store. */
  const onSelectionChange = () => {
    // save selection offset to storage, throttled
    saveSelectionOffset()

    // update command state store
    updateCommandState()

    updateCaretRect()
  }

  /** Input event listener. The caret is measured again after the text changes, since a deletion moves the caret without
   * the browser firing another selectionchange once the new text has been laid out. */
  const onInput = () => updateCaretRect()

  /** Beforeinput event listener. Native undo/redo gestures, and the events nativeHistory dispatches to keep WebKit's history usable, are consumed by nativeHistory before em's own handling sees them. */
  const onBeforeInput = (e: InputEvent) => {
    if (nativeHistory.beforeInput(e)) return
    beforeInput(e)
  }

  /** MouseMove event listener. */
  const onMouseMove = _.debounce(
    () => distractionFreeTypingStore.update(false),
    durations.get('distractionFreeTypingThrottle'),
    {
      leading: true,
    },
  )

  /** Handles scroll-at-edge on drag near the edge of the screen on mobile. */
  // TOOD: Scroll-at-edge for desktop. mousemove is not propagated when drag-and-drop is activated. We may need to tap into canDrop.
  const onTouchMove = (e: TouchEvent) => {
    const state = store.getState()
    const target = e.target as HTMLElement

    if (state.dragCommand) {
      const x = e.touches[0].clientX
      if (x < TOOLBAR_SCROLLATEDGE_SIZE) {
        const rate = 1 + ((TOOLBAR_SCROLLATEDGE_SIZE - x) * TOOLBAR_SCROLLATEDGE_SPEED) / TOOLBAR_SCROLLATEDGE_SIZE
        scrollAtEdge.start({ x: -rate })
      }
      // start scrolling down when within 100px of the right edge of the screen
      else if (x > window.innerWidth - TOOLBAR_SCROLLATEDGE_SIZE) {
        const rate =
          1 +
          ((x - window.innerWidth + TOOLBAR_SCROLLATEDGE_SIZE) * TOOLBAR_SCROLLATEDGE_SPEED) / TOOLBAR_SCROLLATEDGE_SIZE
        scrollAtEdge.start({ x: rate })
      }
      // stop scrolling when not near the edge of the screen
      else {
        scrollAtEdge.stop()
      }
    }
    // do not scroll-at-edge when hovering over DropGutter component
    else if (
      state.longPress === LongPressState.DragInProgress &&
      !(state.alert?.alertType === AlertType.DeleteDropHint)
    ) {
      const y = e.touches[0].clientY
      scrollContainerStore.update({ element: (target.closest('[data-scroll-at-edge]') as HTMLElement) || window })

      // start scrolling up when within 120px of the top edge of the screen
      if (y < WINDOW_SCROLLATEDGE_UP_SIZE) {
        const rate = 1 + ((WINDOW_SCROLLATEDGE_UP_SIZE - y) * WINDOW_SCROLLATEDGE_SPEED) / WINDOW_SCROLLATEDGE_UP_SIZE
        scrollAtEdge.start({ y: -rate })
      }
      // start scrolling down when within 100px of the bottom edge of the screen
      else if (y > window.innerHeight - WINDOW_SCROLLATEDGE_DOWN_SIZE) {
        const rate =
          1 +
          ((y - window.innerHeight + WINDOW_SCROLLATEDGE_DOWN_SIZE) * WINDOW_SCROLLATEDGE_SPEED) /
            WINDOW_SCROLLATEDGE_DOWN_SIZE
        scrollAtEdge.start({ y: rate })
      }
      // stop scrolling when not near the edge of the screen
      else {
        scrollAtEdge.stop()
      }
    }
  }

  /** Stops the scroll-at-edge when dragging stops, releases the element it was scrolling, and clears the caret latch.
   * Every reader of pressOnCaret runs during a touch that has just set it, so clearing here changes nothing today; it
   * keeps the flag's value honest once the press is over, rather than leaving a stale true for whatever reads it next. */
  const onTouchEnd = () => {
    scrollAtEdge.stop()
    scrollContainerStore.reset()
    touchStore.update({ pressOnCaret: false })
  }

  // the identifier of the last touch, so that the touchstart that flushes its withheld touchend can name it in the log
  let lastTouchId: number | undefined

  /** Clears cursor-event suppression: a new touch means subsequent cursor events belong to a new user gesture, not
   * the completed touch. Also latches whether the touch landed on the caret, i.e. whether the user is reaching for the
   * iOS text magnifier rather than starting a drag or a gesture (#3763). Latching here rather than in each reader gives
   * the flag a single writer per touch, measures the caret once, and covers touches that never reach an element that
   * mounts useLongPress. Also decides whether this touch's touchend can be trusted (#5660). Registered in the capture
   * phase because touchstart propagation is unreliable in the bubble phase (see the note on the touchmove listener
   * below); capture also puts it ahead of every reader. */
  const onTouchStart = (e: TouchEvent) => {
    const {
      touchEndTimeStamp,
      touchStartTimeStamp,
      secondTap: previousSecondTap,
      touchEndUnreliable: previousUnreliable,
    } = touchStore.getState()
    const withheldBefore =
      touchStore.getState().touchEndWithheld || storeSession.getItem(TOUCHEND_WITHHELD_KEY) === 'true'
    const touchGap = e.timeStamp - touchEndTimeStamp
    // iOS 27 withholds the touchend of a tap and dispatches it immediately before the next touchstart, with the same
    // timeStamp. No finger can lift and touch down again within a few milliseconds, so a gap that short means the
    // touchend was withheld. iOS does not leave that state for the rest of the session, even across a reload.
    const touchEndWithheld = withheldBefore || touchGap < TOUCHEND_WITHHELD_MS
    // iOS may never end the second tap of a double tap, wherever it lands, even on another thought. Only WebKit is
    // affected.
    const secondTap = isSafari() && e.timeStamp - touchStartTimeStamp < DOUBLE_TAP_MS
    // The first withheld tap after a double tap has no withheld touchend before it, so only the double tap gives it away.
    const afterDoubleTap = previousSecondTap
    // Only a tap that does nothing, such as one on the caret's own word, gives no sign that the finger has lifted.
    // Elsewhere iOS still fires click at the lift, which ends the press in useLongPress.
    // changedTouches is the finger that just landed; touches[0] is the first one still down, which a second finger
    // arriving mid-edit would measure instead.
    const touch = e.changedTouches[0]
    const onCaretWord = !!touch && selection.isOnCaretWord(touch.clientX, touch.clientY)
    const touchEndUnreliable = secondTap || ((touchEndWithheld || afterDoubleTap) && onCaretWord)

    // One entry per stuck touch, so that it can be counted without reading the pointer events around it.
    if (touchGap < TOUCHEND_WITHHELD_MS) {
      debugLog.log('touchEndWithheld', {
        id: lastTouchId,
        heldFor: Math.round(touchEndTimeStamp - touchStartTimeStamp),
        guarded: previousUnreliable,
      })
    }
    lastTouchId = touch?.identifier

    // Every input to the guard, on every touch, so that a long press that did or did not start can be traced to it.
    debugLog.log('touchGuard', {
      id: touch?.identifier,
      touchGap: Math.round(touchGap),
      touchInterval: Math.round(e.timeStamp - touchStartTimeStamp),
      touchEndWithheld,
      secondTap,
      afterDoubleTap,
      onCaretWord,
      touchEndUnreliable,
    })

    if (touchEndWithheld && !withheldBefore) storeSession.setItem(TOUCHEND_WITHHELD_KEY, 'true')
    touchStore.update({
      pressOnCaret: isTouch && isSafari() && !!touch && selection.isCaretNear(touch.clientX, touch.clientY),
      suppressCursorAfterTouch: false,
      touchStartTimeStamp: e.timeStamp,
      touchEnded: false,
      nativeTapPending: false,
      secondTap,
      touchEndWithheld,
      touchEndUnreliable,
    })
  }

  /** Logs touch pointer events. A touch whose pointerdown is never followed by pointerup or pointercancel is one whose end iOS withheld (#5660). */
  const onTouchPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    debugLog.log(e.type, { id: e.pointerId, x: Math.round(e.clientX), y: Math.round(e.clientY) })
  }

  /** Logs the touch backend's long-press timer, which it dispatches on document once per press, and whether the #5660 guard refused the press. A timer that is not refused is followed by longPressStart. */
  const onLongPressTimer = () => debugLog.log('longPressTimer', { refused: touchStore.getState().touchEndUnreliable })

  /** Returns the id of the thought whose editable contains the node, or null. */
  const editableThought = (node: EventTarget | Node | null): string | null => {
    const el = node instanceof Element ? node : node instanceof Node ? node.parentElement : null
    return (
      el
        ?.closest('[data-editable]')
        ?.getAttribute('aria-label')
        ?.replace(/^editable-/, '') ?? null
    )
  }

  /** Logs a mouse event that arrives before its touch's touchend, and the thought it targets, and tracks whether iOS is between that touch's mousedown and mouseup. When iOS withholds the touchend, these are the only sign that the finger has lifted, and iOS can retarget them to the thought it left (#5660). */
  const onMouseBeforeTouchEnd = (e: MouseEvent) => {
    if (touchStore.getState().touchEnded) return
    debugLog.log(`${e.type}BeforeTouchEnd`, { thought: editableThought(e.target) })
    touchStore.update({ nativeTapPending: e.type === 'mousedown' })
  }

  let caretThought: string | null = null

  /** Logs the thought that holds the caret whenever the caret moves into a different thought, so that where a tap actually put the caret can be read from the log (#5660). */
  const onCaretMove = () => {
    const thought = selection.thought()
    if (thought === caretThought) return
    caretThought = thought
    debugLog.log('caret', { thought, offset: thought ? selection.offset() : null })
  }

  /** Records when the touch ended, so that the next touchstart can tell whether its touchend was withheld (#5660). Registered in the capture phase so that a handler that stops propagation cannot hide it. */
  const onTouchEndCapture = (e: TouchEvent) => {
    touchStore.update({ touchEndTimeStamp: e.timeStamp, touchEnded: true, nativeTapPending: false })
  }

  /**
   * Prevents native pinch-to-zoom on iOS Safari. Safari ignores the viewport `user-scalable=no` /
   * `maximum-scale=1` settings and still allows pinch-to-zoom and two-finger panning of the page,
   * both of which should be inert in the app. `gesturestart`/`gesturechange`/`gestureend` are
   * Safari-only events fired for multi-finger gestures. See #4233.
   */
  const onSafariGesture = (e: Event) => e.preventDefault()

  /**
   * Prevents native behavior during a two-finger gesture (e.g. two-finger tracing or pinch). While the
   * multitouch latch is set, this preventDefaults touchmove so the browser does not move the contentEditable
   * caret / extend the text selection to follow the fingers (observed on iOS Safari) or scroll the page. It is
   * a no-op for single-finger interactions (the latch is only set once a second finger is down), so normal
   * scrolling and text selection are unaffected. Registered non-passively so preventDefault is honored. See #4233.
   *
   * Three or more fingers are left alone, since gestures of that size belong to the OS rather than to em —
   * notably the iOS three-finger swipe that drives undo and redo. Suppressing the default there would fight the
   * system gesture recognizer for touches em has no use for anyway. The latch still covers the tail of a
   * two-finger gesture, when one finger has lifted and the caret would otherwise follow the remaining one.
   */
  const onMultitouchMove = (e: TouchEvent) => {
    if (multitouchStore.getState() && e.touches.length < 3 && e.cancelable) e.preventDefault()
  }

  /**
   * Clears the multitouch latch when a mouse or pen interaction begins, since neither can be part of a
   * multi-touch gesture. Without this the latch, which is otherwise only reset by a fresh single-finger
   * touchstart, would survive indefinitely on a device that has both a touchscreen and a pointer (e.g. a
   * touchscreen laptop or an iPad with a trackpad): after a two-finger touch every subsequent click would be
   * rejected by the tap and mousedown handlers and the cursor could no longer be moved. The terminating
   * tap/click of a multi-touch gesture is unaffected, because the compatibility mousedown/click a touch
   * synthesizes is dispatched without a preceding pointerdown of type mouse. See #4233.
   */
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') multitouchStore.update(false)
  }

  /** The geometry of the last viewport entry written to the debug log, so that resize events that change nothing it records do not flood the log. */
  let lastViewportLogged = ''

  /** Logs the viewport geometry to the debug log. A resize entry is skipped when the geometry matches the last entry. Resume and settled entries are always written, so the geometry at every resume is on record even when nothing changed. This makes a layout that was left at the wrong size visible in the log, such as the nav bar drawn mid-screen after returning to the app because iOS kept the keyboard-open viewport height. */
  const logViewport = (reason: 'resize' | 'resume' | 'settled') => {
    // skip the layout reads below when nothing will be logged
    if (!debugLog.isEnabled()) return
    const visualViewport = window.visualViewport
    const geometry = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      // height of the layout viewport, which position: fixed and position: sticky elements are laid out against
      clientHeight: document.documentElement.clientHeight,
      visualViewportHeight: visualViewport ? Math.round(visualViewport.height) : null,
      visualViewportOffsetTop: visualViewport ? Math.round(visualViewport.offsetTop) : null,
      scrollY: Math.round(window.scrollY),
      isKeyboardOpen: store.getState().isKeyboardOpen,
    }
    const serialized = JSON.stringify(geometry)
    if (reason === 'resize' && serialized === lastViewportLogged) return
    lastViewportLogged = serialized
    debugLog.log('viewport', { reason, ...geometry })
  }

  /** Logs the viewport geometry on resize. */
  const onResizeLog = () => logViewport('resize')

  /** Handle a page lifecycle state change, i.e. switching apps. */
  const onStateChange = ({ oldState, newState }: { oldState: LifecycleState; newState: LifecycleState }) => {
    passiveTimeoutStore.reset()

    // Log lifecycle transitions so that events can be correlated with the app being backgrounded or foregrounded, e.g. a false Command Center open right before an app switch. More direct than inferring suspension from gaps in the log timeline.
    debugLog.log('lifecycle', { oldState, newState })

    // Log the viewport geometry when the app resumes and again once it has had time to settle, so that a viewport left at the wrong size by the app switch shows up in the log.
    resumeSettleTimeoutStore.reset()
    if (newState === 'active') {
      logViewport('resume')
      resumeSettleTimeoutStore.update({ timer: setTimeout(logViewport, RESUME_SETTLE_DELAY, 'settled') })
    }

    // dismiss the gesture alert on hide
    if (newState === 'hidden' || oldState === 'hidden') {
      const state = store.getState()
      if (state.alert?.alertType === AlertType.GestureHint) {
        store.dispatch(alert(null))
      }
      if (state.showGestureMenu) {
        store.dispatch(gestureMenu())
      }
      // we could also persist unsaved data here
    }
    // If the app is backgounded while keyboard is open, then the keyboard will not open when switching back to the app, even when focusNode, document.activeElement, and visualViewport.height all indicate that the keyboard is open. Strangely, the app enters the 'passive' state after hidden -> passive -> active completes. The invalid state can be detected with document.hasFocus(). Since there is no way to force the app to be active when it is passive, then we do not bother trying to re-open the keyboard, and instead disable keyboard is open so that at least it matches what the user sees. Use a timeout to ensure that this is called only when the device stays in the passive state, not when it is moving from hidden -> passive -> active.
    // https://github.com/cybersemics/em/issues/1468
    else if (
      isTouch &&
      isSafari() &&
      oldState === 'active' &&
      newState === 'passive' &&
      document.activeElement &&
      // document.activeElement falls back to the body when nothing is focused, so the keyboard can only be open if
      // some other element has focus. Without this, Clear Thought's asynchronous focus was mistaken for an app
      // switch and the caret it had just placed was cleared. https://github.com/cybersemics/em/pull/4520
      document.activeElement !== document.body &&
      !document.hasFocus()
    ) {
      passiveTimeoutStore.update({ timer: setTimeout(selection.clear, 10) })
    }
  }
  /** Drag leave handler for file drag-and-drop. Does not handle drag end. */
  const dragLeave = _.debounce(() => {
    store.dispatch((dispatch, getState) => {
      // e.dataTransfer.types is not available in dragLeave for some reason, so we check state.draggingFile
      const state = getState()
      if (state.draggingFile) {
        dispatch([alert(null), longPress({ value: LongPressState.Inactive })])
      }
    })
  }, 100)

  /** Drag enter handler for file drag-and-drop. Sets state.longPress to DragInProgress and state.draggingFile to true. */
  const dragEnter = (e: DragEvent) => {
    // dragEnter and dragLeave are called in alternating pairs as the user drags over nested elements: ENTER, LEAVE, ENTER, LEAVE, ENTER
    // In order to detect the end of dragging a file, we need to debounce the dragLeave event and cancel it if dragEnter occurs.
    // Inspired by: https://stackoverflow.com/questions/3144881/how-do-i-detect-a-html5-drag-event-entering-and-leaving-the-window-like-gmail-d

    const hasSelectionRange = selectionRangeStore.getState()
    if (hasSelectionRange) return

    setTimeout(() => {
      dragLeave.cancel()
    })
    if (e.dataTransfer?.types.includes('Files')) {
      store.dispatch([
        alert('Drop to import file'),
        longPress({ value: LongPressState.DragInProgress, draggingFile: true }),
      ])
    }
  }

  /** Drop handler for file drag-and-drop. */
  const drop = (e: DragEvent) => {
    if (e.dataTransfer?.types.includes('Files')) {
      // wait until the next tick so that the thought/subthought drop handler has a chance to be called before draggingFile is reset
      // See: DragAndDropThought and DragAndDropSubthoughts
      setTimeout(() => {
        store.dispatch([alert(null), longPress({ value: LongPressState.Inactive })])
      })
    }
  }

  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('selectionchange', onCaretMove)
  document.addEventListener('input', onInput)
  window.addEventListener('beforeinput', onBeforeInput)
  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('popstate', onPopstate)
  window.addEventListener('mousemove', onMouseMove)
  // Note: touchstart may not be propagated after dragHold
  window.addEventListener('touchstart', onTouchStart, { capture: true })
  for (const type of ['pointerdown', 'pointerup', 'pointercancel'] as const) {
    window.addEventListener(type, onTouchPointer, { capture: true, passive: true })
  }
  for (const type of ['mousedown', 'mouseup', 'click'] as const) {
    window.addEventListener(type, onMouseBeforeTouchEnd, { capture: true, passive: true })
  }
  window.addEventListener('dragStart', onLongPressTimer, { capture: true })
  window.addEventListener('touchend', onTouchEndCapture, { capture: true })
  window.addEventListener('touchmove', onTouchMove)
  window.addEventListener('touchend', onTouchEnd)
  // track the number of active touch points so that multi-touch input can be rejected (e.g. two-finger
  // tracing must not begin a drag-and-drop). Registered in the capture phase for the same reason as
  // onTouchStart above (touchstart may not be propagated), and so that the latch is set before the gesture
  // and drag subsystems read it. See #4233.
  window.addEventListener('touchstart', updateMultitouch, { capture: true })
  window.addEventListener('touchend', updateMultitouch)
  window.addEventListener('touchcancel', updateMultitouch)
  // Registered in the capture phase so that the latch is cleared before the gesture, drag, and cursor-set
  // subsystems read it in the same interaction.
  window.addEventListener('pointerdown', onPointerDown, { capture: true })
  // Multi-touch suppression is registered on touch devices only. macOS Safari fires the same gesture* events for
  // a trackpad pinch, where zooming the page is legitimate browser behavior that must not be blocked. And a
  // non-passive (blocking) touchmove listener on window marks the entire viewport as a blocking touch-handler
  // region, which changes how Chrome composites the page and shifts the subpixel anti-aliasing of composited
  // elements such as the NavBar home icon; that is invisible to the user, but it breaks the render-thoughts
  // image snapshots on desktop, where the listener can never fire anyway. See #4233.
  if (isTouch) {
    // prevent the native caret / text selection and scrolling from following the fingers during a multi-touch
    // gesture (non-passive so preventDefault is honored)
    window.addEventListener('touchmove', onMultitouchMove, { passive: false })
    // disable native pinch-to-zoom / two-finger page panning on iOS Safari
    document.addEventListener('gesturestart', onSafariGesture)
    document.addEventListener('gesturechange', onSafariGesture)
    document.addEventListener('gestureend', onSafariGesture)
  }
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('scroll', updateScrollTop)
  window.addEventListener('dragenter', dragEnter)
  window.addEventListener('dragleave', dragLeave)
  window.addEventListener('drop', drop)

  const resizeHost = window.visualViewport || window
  resizeHost.addEventListener('resize', updateSize)
  resizeHost.addEventListener('resize', onResizeLog)

  // Initialize virtual keyboard handlers
  const unsubscribeKeyboardSelection = initKeyboardSelection()
  virtualKeyboardHandler.init()

  // Route iOS native undo/redo gestures through em's undo/redo in the Capacitor app
  nativeHistory.init()

  // clean up on app switch in PWA
  // https://github.com/cybersemics/em/issues/1030
  lifecycle.addEventListener('statechange', onStateChange)

  /** Remove window event handlers. */
  const cleanup = () => {
    passiveTimeoutStore.reset()
    document.removeEventListener('selectionchange', onSelectionChange)
    document.removeEventListener('selectionchange', onCaretMove)
    document.removeEventListener('input', onInput)
    window.removeEventListener('beforeinput', onBeforeInput)
    window.removeEventListener('keydown', keyDown)
    window.removeEventListener('keyup', keyUp)
    window.removeEventListener('popstate', onPopstate)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('touchstart', onTouchStart, { capture: true })
    for (const type of ['pointerdown', 'pointerup', 'pointercancel'] as const) {
      window.removeEventListener(type, onTouchPointer, { capture: true })
    }
    for (const type of ['mousedown', 'mouseup', 'click'] as const) {
      window.removeEventListener(type, onMouseBeforeTouchEnd, { capture: true })
    }
    window.removeEventListener('dragStart', onLongPressTimer, { capture: true })
    window.removeEventListener('touchend', onTouchEndCapture, { capture: true })
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchstart', updateMultitouch, { capture: true })
    window.removeEventListener('touchend', updateMultitouch)
    window.removeEventListener('touchcancel', updateMultitouch)
    window.removeEventListener('pointerdown', onPointerDown, { capture: true })
    window.removeEventListener('touchmove', onMultitouchMove)
    document.removeEventListener('gesturestart', onSafariGesture)
    document.removeEventListener('gesturechange', onSafariGesture)
    document.removeEventListener('gestureend', onSafariGesture)
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('scroll', updateScrollTop)
    window.removeEventListener('dragenter', dragEnter)
    window.removeEventListener('dragleave', dragLeave)
    window.removeEventListener('drop', drop)
    lifecycle.removeEventListener('statechange', onStateChange)
    resizeHost.removeEventListener('resize', updateSize)
    resizeHost.removeEventListener('resize', onResizeLog)
    resumeSettleTimeoutStore.reset()
    unsubscribeKeyboardSelection()
    virtualKeyboardHandler.destroy()
    nativeHistory.destroy()
    eventHandlers = null
  }

  eventHandlers = { keyDown, keyUp, cleanup }

  // return input handlers as another way to remove them on cleanup
  return eventHandlers
}

/** Error event listener. This does not catch React errors. See the ErrorFallback component that is used in the error boundary of the App component. */
// const onError = (e: { message: string; error?: Error }) => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onError = (e: any) => {
  // Ignore opaque cross-origin "Script error." events. The browser emits these when an error occurs in a
  // script served from a different origin without CORS headers. They carry no actionable information (no
  // stack, filename, or line number), so showing them as an error banner only confuses the user. On iOS
  // Safari, interacting with the browser's native share menu triggers such an error.
  // See https://github.com/cybersemics/em/issues/4402.
  if (!e.error && (e.message === 'Script error.' || e.message === 'Script error')) return

  console.error({ message: e.message, code: e.code, errors: e.errors })
  if (e.error && 'stack' in e.error) {
    console.error(e.error.stack)
  }
  store.dispatch(error({ value: e.message }))
}

// error handler must be added immediately to catch auth errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', onError)
}

export default initEvents
