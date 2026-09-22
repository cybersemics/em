import { PluginListenerHandle } from '@capacitor/core'
import { WebviewBackground } from 'webview-background'
import { isCapacitor, isIOS, isSafari, isTouch } from '../browser'
import { handleNativeHistory } from '../commands'
import { NATIVE_HISTORY_REGISTER_DELAY } from '../constants'
import isRedoEnabled from '../selectors/isRedoEnabled'
import isUndoEnabled from '../selectors/isUndoEnabled'
import store from '../stores/app'
import nativeHistoryGestureStore from '../stores/nativeHistoryGesture'

/** The pending plugin listener registration, kept so that the listener can be removed on destroy. */
let listener: Promise<PluginListenerHandle> | null = null

/** Unsubscribes the store subscription that reports undo/redo availability to iOS. */
let unsubscribe: (() => void) | null = null

/** Minimum horizontal travel for a three-finger swipe to count as a gesture rather than a stray multitouch, in px. */
const SWIPE_THRESHOLD = 50

/** Where the three fingers started and where they last were, or null while no three-finger touch is in progress. */
let swipe: { startX: number; startY: number; x: number; y: number } | null = null

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

  nativeHistoryGestureStore.update(Date.now())
  handleNativeHistory(dx > 0 ? 'redo' : 'undo', { registerDelay: NATIVE_HISTORY_REGISTER_DELAY })
}

/**
 * Routes iOS native undo/redo gestures — three-finger swipe, shake-to-undo, and the Edit menu — through em's
 * own undo/redo.
 *
 * In the browser these gestures surface as a `historyUndo`/`historyRedo` `beforeinput` event, which
 * `beforeInput` intercepts. WebKit only dispatches that event while its own undo stack has a step to undo,
 * and it registers a step only for edits it performed itself. Since em applies most edits by re-rendering
 * the contenteditable from Redux, WebKit's stack runs dry long before em's history does; from then on iOS
 * handles the gesture itself and reports "Nothing to Undo" while em still has plenty to undo.
 *
 * The Capacitor app closes that gap natively: `NativeHistoryWebView` hands the responder chain an undo
 * manager that emits `nativeHistory` instead of performing the gesture, so it reaches em regardless of
 * WebKit's stack. Since the gesture is then consumed natively, no `beforeinput` is dispatched and the two
 * routes cannot both fire for a single gesture.
 *
 * That manager has no history of its own to answer from, so em reports its own undo/redo availability to it,
 * which iOS reads to decide whether to deliver the gesture at all. Gestures it does deliver are confirmed
 * with an "Undo"/"Redo" overlay, so without this the overlay confirms an undo or redo that does nothing.
 *
 * In Mobile Safari there is no such manager, and WebKit's own stack is empty for redo because `beforeInput`
 * prevented the undo that would have filled it — so the redo gesture is never dispatched ([#5575]). The three-finger
 * swipe is therefore recognized here, from the touch events iOS delivers alongside the system gesture, which
 * depends on no browser state and works with an empty thoughtspace. Shake and the Edit menu produce no touches and
 * keep arriving through `beforeInput`.
 */
const nativeHistory = {
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
    listener?.then(handle => handle.remove())
    listener = null
    unsubscribe?.()
    unsubscribe = null
  },
}

export default nativeHistory
