import { PluginListenerHandle } from '@capacitor/core'
import { WebviewBackground } from 'webview-background'
import { isCapacitor, isIOS, isSafari, isTouch } from '../browser'
import { handleNativeHistory } from '../commands'
import isRedoEnabled from '../selectors/isRedoEnabled'
import isUndoEnabled from '../selectors/isUndoEnabled'
import store from '../stores/app'
import editableSyncStore from '../stores/editableSyncStore'
import { registerReset } from '../stores/ministore'
import * as selection from './selection'

/** How long after a three-finger swipe recognized from touch events the matching `historyUndo`/`historyRedo` `beforeinput` is treated as the same gesture rather than a new one. */
const SWIPE_BEFOREINPUT_TIMEOUT = 1000

/** How long to wait after a touch-recognized swipe before registering a fresh redo step, so that em's re-render and the caret restore that follows it land first. */
const SWIPE_REGISTER_DELAY = 1000

/** Minimum horizontal travel for a three-finger swipe to count as a gesture rather than a stray multitouch, in px. */
const SWIPE_THRESHOLD = 50

/** The pending plugin listener registration, kept so that the listener can be removed on destroy. */
let listener: Promise<PluginListenerHandle> | null = null

/** Unsubscribes the store subscription that reports undo/redo availability to iOS. */
let unsubscribe: (() => void) | null = null

/** Where the three fingers started and where they last were, or null while no three-finger touch is in progress. */
let swipe: { startX: number; startY: number; x: number; y: number } | null = null

/** Time of the last three-finger swipe recognized from touch events. The same swipe arrives again as a `beforeinput` a moment later, which `beforeInput` skips so that one gesture is not applied twice. */
let swipedAt = -Infinity

/** Whether a native undo/redo is being replayed by recycle, so that the `beforeinput` it dispatches is swallowed instead of routed to em's undo/redo a second time. */
let recycling = false

/** How many history `beforeinput` events the replay dispatched. WebKit keeps reporting `queryCommandEnabled('undo')` as true after it has stopped dispatching the event, so the dispatch itself is the only reliable signal that a step is still there. */
let replayedEvents = 0

/** Set while the synthetic execCommands in registerRedoStep are running, so that the `historyUndo` `beforeinput` they dispatch is passed through to WebKit instead of being routed through em's undo. */
let registeringRedoStep = false

/** The hidden editing host, created on first use. */
let anchor: HTMLDivElement | null = null

/**
 * Focuses a hidden contenteditable so that WebKit has an editing host to register a native history step on, and
 * returns whether it took focus.
 *
 * WebKit dispatches the `historyUndo`/`historyRedo` `beforeinput` that carries an iOS native undo/redo gesture only
 * to a focused editing host, and only while its own stack has a step in that direction. The editing hosts in em are
 * the thoughts themselves, so undoing the creation of the only thought leaves none: the gesture is then delivered
 * nowhere and iOS confirms a redo that restores nothing (#5575). This host always exists, so the route survives an
 * empty thoughtspace.
 *
 * It is never focused while a thought is, so it cannot take the caret from one. The zero-width space gives
 * execCommand a text node to insert into, `inputmode=none` keeps the software keyboard shut, and `pointer-events:
 * none` keeps it out of reach of taps.
 */
const focusAnchor = (): boolean => {
  if (!isTouch || !isSafari()) return false

  if (!anchor) {
    anchor = document.createElement('div')
    anchor.contentEditable = 'true'
    anchor.setAttribute('data-native-history-anchor', '')
    anchor.setAttribute('inputmode', 'none')
    anchor.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none'
    anchor.textContent = '​'
    document.body.appendChild(anchor)
  }

  anchor.focus({ preventScroll: true })
  selection.selectNode(anchor)
  selection.collapse()

  return document.activeElement === anchor
}

/**
 * Registers a single native redo step in WKWebView, so that the shake-to-redo gesture is delivered at all.
 *
 * WebKit offers a redo gesture only while its own redo stack has a step, and a step lands there only when WebKit
 * itself performs an undo. Since `beforeInput` prevents the native undo and performs em's undo instead, WebKit's redo
 * stack stays empty and the redo gesture never reaches em: iOS confirms the gesture with its own overlay while
 * nothing is restored (#5575). A shake reaches em through `beforeinput` alone, so without a step there is nothing to
 * deliver.
 *
 * This inserts an empty marker and immediately undoes it natively, which moves that step onto the redo stack. Its DOM
 * effect is immaterial: the insert is undone before the function returns, and editableSync's suppressChange hides both
 * mutations from the Editable change handler, so no edit is recorded and the editable is not re-rendered. The step
 * exists only as the anchor that makes the native redo gesture fire; the `historyRedo` it eventually dispatches is
 * preventDefaulted like any other, so the step survives and further redo gestures keep firing.
 *
 * Must run after em's undo/redo has re-rendered the editable, since a step registered before the re-render points at
 * DOM that the re-render replaces — WebKit then silently discards the step when the gesture arrives, dispatching
 * nothing, which is indistinguishable from never having registered it.
 *
 * Registration needs a focused editing host, and undoing the creation of the only thought leaves none, so an insert
 * that finds no editable selection falls back to the hidden anchor. The undo runs only once an insert has succeeded,
 * since it would otherwise revert the user's own last edit.
 *
 * No-op outside iOS Mobile Safari. The Capacitor app is excluded because its gestures are consumed natively and
 * never consult WebKit's stacks (isTouch && isSafari alone would match its WKWebView too), and desktop Safari has no
 * shake or three-finger undo.
 */
const registerRedoStep = (): void => {
  if (!isTouch || !isSafari() || isCapacitor()) return
  editableSyncStore.update({ suppressChange: true })
  registeringRedoStep = true
  const marker = '<span data-native-history></span>'
  const inserted =
    document.execCommand('insertHTML', false, marker) ||
    (focusAnchor() && document.execCommand('insertHTML', false, marker))
  if (inserted) {
    document.execCommand('undo')
  }
  registeringRedoStep = false
  editableSyncStore.update({ suppressChange: false })
}

/** Moves WebKit's position through its own history and immediately back, which is net-zero while a step is available in the replayed direction and reclaims the step the gesture consumed once it is not. Returns the number of steps the replay found. */
const replay = (type: 'undo' | 'redo'): number => {
  replayedEvents = 0
  document.execCommand(type)
  document.execCommand(type === 'undo' ? 'redo' : 'undo')
  return replayedEvents
}

/**
 * Returns to WebKit's own history the step that a native undo/redo gesture consumed, so that the next gesture is still
 * dispatched.
 *
 * WebKit dispatches the `historyUndo`/`historyRedo` `beforeinput` only while its own history has a step in that
 * direction, and it registers a step only for edits it performed itself. Since em applies most edits by re-rendering
 * the editable from Redux, WebKit's history holds far fewer steps than em's — and because preventing the event still
 * advances WebKit's position, the gestures run out while em still has plenty to undo, after which iOS handles the
 * gesture itself and reports "Nothing to Undo" (#4984).
 *
 * Advancing WebKit's position is reversible, so replaying the gesture and immediately inverting it — both prevented,
 * neither routed to em — leaves a step on either side of WebKit's position for as long as it holds any step at all.
 * Unlike anchoring a step with an `insertHTML` (#4637), the replay mutates no DOM and discards no redo steps, so
 * native redo keeps working.
 *
 * The replay has nothing to recycle when the step the gesture consumed belonged to an editable that em's undo has
 * since unmounted — WebKit drops such a step instead of making it redoable — so that gesture empties the history for
 * good and every later gesture drains the steps typing registers afterwards, one per gesture, until iOS is again
 * reporting "Nothing to Undo". Anchoring a step in the editable that is focused now restores the foothold: the text is
 * typed and deleted again, so the thought is left as it was, and the replay that follows makes the anchored step
 * redoable as well as undoable.
 *
 * No-op outside iOS Safari, which is the only place a native history gesture arrives as a `beforeinput`: the Capacitor
 * app receives it as a `nativeHistory` plugin event instead, which never touches WebKit's history.
 */
const recycle = (type: 'undo' | 'redo') => {
  if (!isTouch || !isSafari()) return
  // Defer so that the replay does not re-enter the beforeinput dispatch that triggered it.
  setTimeout(() => {
    recycling = true
    // Anchor a step only when the replay came up empty, and only with a collapsed caret in a thought, since typing
    // over a selection would destroy the selected text rather than restore it.
    if (replay(type) === 0 && selection.isCollapsed() && selection.isThought()) {
      editableSyncStore.update({ suppressChange: true })
      if (document.execCommand('insertText', false, ' ')) document.execCommand('delete')
      editableSyncStore.update({ suppressChange: false })
      replay('undo')
    }
    recycling = false
  })
}

/**
 * Applies a native gesture as em's undo/redo, then registers a fresh redo step in WebKit.
 *
 * The undo re-renders the editable WebKit recorded its step against, which leaves that step stale: WebKit discards it
 * when the next gesture arrives and dispatches nothing, so a later shake reaches em nowhere (#5575). A step registered
 * before the re-render lands is stale on arrival, so the caller says how long that takes on its route: a `beforeinput`
 * already arrives late enough for the next task to be clear, while the touch route runs at touchend, well before the
 * re-render.
 */
const applyGesture = (type: 'undo' | 'redo', registerDelay: number) => {
  handleNativeHistory(type)
  setTimeout(registerRedoStep, registerDelay)
}

/** Mean position of all active touches. */
const centroid = (touches: TouchList): { x: number; y: number } => {
  let x = 0
  let y = 0
  for (let i = 0; i < touches.length; i++) {
    x += touches[i].clientX
    y += touches[i].clientY
  }
  return { x: x / touches.length, y: y / touches.length }
}

/** Starts tracking once exactly three fingers are down. */
const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length !== 3) {
    swipe = null
    return
  }
  const { x, y } = centroid(e.touches)
  swipe = { startX: x, startY: y, x, y }
}

/** Follows the three fingers. The `touchend` event cannot be used to measure the end position, since by then no touches remain. */
const onTouchMove = (e: TouchEvent) => {
  if (!swipe || e.touches.length !== 3) return
  const { x, y } = centroid(e.touches)
  swipe.x = x
  swipe.y = y
}

/** Applies the gesture once every finger is up, if the swipe was far enough and more horizontal than vertical. */
const onTouchEnd = (e: TouchEvent) => {
  if (e.touches.length > 0) return
  const gesture = swipe
  swipe = null
  if (!gesture) return

  const dx = gesture.x - gesture.startX
  const dy = gesture.y - gesture.startY
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return

  swipedAt = Date.now()
  applyGesture(dx > 0 ? 'redo' : 'undo', SWIPE_REGISTER_DELAY)
}

/**
 * Routes iOS native undo/redo gestures — three-finger swipe, shake-to-undo, and the Edit menu — through em's
 * own undo/redo.
 *
 * In the browser these gestures surface as a `historyUndo`/`historyRedo` `beforeinput` event, which
 * `beforeInput` intercepts. WebKit only dispatches that event while its own undo stack has a step to undo,
 * and it registers a step only for edits it performed itself. Since em applies most edits by re-rendering
 * the contenteditable from Redux, WebKit's stack holds far fewer steps than em's history, so `beforeInput`
 * recycles WebKit's position through the stack after each gesture to keep a step available on either side,
 * anchoring a fresh step in the focused editable when the position has been lost along with the editable it
 * belonged to.
 *
 * In Mobile Safari the redo step the recycle leaves behind belongs to the editable em's undo has just re-rendered, so
 * every gesture em handles registers a fresh redo step once the re-render has landed (#5575). The three-finger swipe
 * is also recognized here, from the touch events iOS delivers alongside the system gesture, which depends on no
 * browser state and works with an empty thoughtspace. Shake and the Edit menu produce no touches and keep arriving
 * through `beforeInput`.
 *
 * The Capacitor app sidesteps WebKit's stack entirely: `NativeHistoryWebView` hands the responder chain an undo
 * manager that emits `nativeHistory` instead of performing the gesture, so it reaches em regardless of
 * WebKit's stack. Since the gesture is then consumed natively, no `beforeinput` is dispatched and the two
 * routes cannot both fire for a single gesture.
 *
 * That manager has no history of its own to answer from, so em reports its own undo/redo availability to it,
 * which iOS reads to decide whether to deliver the gesture at all. Gestures it does deliver are confirmed
 * with an "Undo"/"Redo" overlay, so without this the overlay confirms an undo or redo that does nothing.
 */
const nativeHistory = {
  /**
   * Handles the native history events of a `beforeinput`, and returns true when the event is consumed and must not
   * reach em's other `beforeinput` handling.
   *
   * Native undo/redo (iOS shake-to-undo or three-finger swipe) fires a cancelable beforeinput with inputType
   * historyUndo/historyRedo. Left unhandled, it mutates the contenteditable DOM directly, bypassing em's undo and
   * leaving stale formatting markup (e.g. a black font color from a removed background highlight) that renders the
   * thought invisible (#3954). Block the native undo before it touches the DOM and route it through em's undo/redo,
   * which reverts to the correct Redux state and re-renders the editable. The cancelable check gates on the case we
   * can actually prevent; native browser undo is intentionally superseded by em's undo (#3879).
   */
  beforeInput: (e: InputEvent): boolean => {
    const isHistory = (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') && e.cancelable

    // Pass through the events dispatched by registerRedoStep's own execCommands, including its `historyUndo`.
    // Letting WebKit perform that undo is the entire point of the call: it is what moves a step onto the redo stack.
    if (registeringRedoStep) return true

    // The replay and anchor are dispatched only to move WebKit's position, so nothing may act on them: undoing em a
    // second time would consume a step of em's history that no gesture asked for, and the anchored space would be
    // read as the Android space-to-indent case. The replay is still prevented, since performing it would mutate the
    // DOM; the anchor is not, since WebKit registers the step by performing it.
    if (recycling) {
      if (isHistory) {
        e.preventDefault()
        replayedEvents++
      }
      return true
    }

    if (!isHistory) return false

    e.preventDefault()

    // On iOS Mobile Safari, a three-finger swipe reaches em twice: once as the touch events recognized above, and
    // again here a moment later. The default is still prevented so WebKit cannot mutate the contenteditable, but the
    // gesture has already been applied, and the touch route has already scheduled the step it depends on. Recycling
    // here as well would move WebKit's position back across that step and could leave only a stale step on the undo
    // side.
    if (Date.now() - swipedAt > SWIPE_BEFOREINPUT_TIMEOUT) {
      const type = e.inputType === 'historyUndo' ? 'undo' : 'redo'
      // Scheduled before applyGesture schedules registerRedoStep, so that the replay runs first: replaying after the
      // registration would move WebKit's position across the freshly registered redo step.
      recycle(type)
      applyGesture(type, 0)
    }
    return true
  },
  /** Subscribes to native history gestures and reports undo/redo availability. */
  init: () => {
    if (isTouch && isSafari() && !isCapacitor()) {
      window.addEventListener('touchstart', onTouchStart)
      window.addEventListener('touchmove', onTouchMove)
      window.addEventListener('touchend', onTouchEnd)
    }

    if (!isCapacitor() || !isIOS || listener) return

    listener = WebviewBackground.addListener('nativeHistory', event => handleNativeHistory(event.type))

    let canUndo: boolean | null = null
    let canRedo: boolean | null = null

    /** Reports em's undo/redo availability to iOS when it changes. */
    const updateHistoryAvailability = () => {
      const state = store.getState()
      const canUndoNext = isUndoEnabled(state)
      const canRedoNext = isRedoEnabled(state)
      if (canUndoNext === canUndo && canRedoNext === canRedo) return
      canUndo = canUndoNext
      canRedo = canRedoNext
      // Swallow the rejection Capacitor raises when the app binary predates the plugin method, as when a
      // server-mode build loads a newer web bundle. iOS then keeps offering the gesture unconditionally,
      // which is how em behaved before it reported availability at all.
      WebviewBackground.setHistoryAvailability({ canUndo, canRedo }).catch(() => {})
    }

    updateHistoryAvailability()
    unsubscribe = store.subscribe(updateHistoryAvailability)
  },
  /** Unsubscribes from native history gestures and availability reporting. Removes the listener once registration resolves, so that a destroy that beats the pending registration still takes effect. */
  destroy: () => {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    swipe = null
    swipedAt = -Infinity
    listener?.then(handle => handle.remove())
    listener = null
    unsubscribe?.()
    unsubscribe = null
  },
}

// Remove the plugin listener and the store subscription at every test boundary. init is idempotent only while they are
// held, so releasing them is what lets the next test init again.
registerReset(nativeHistory.destroy)

export default nativeHistory
