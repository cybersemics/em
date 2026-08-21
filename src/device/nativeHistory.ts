import { PluginListenerHandle } from '@capacitor/core'
import { WebviewBackground } from 'webview-background'
import { isCapacitor, isIOS } from '../browser'
import { handleNativeHistory } from '../commands'
import isRedoEnabled from '../selectors/isRedoEnabled'
import isUndoEnabled from '../selectors/isUndoEnabled'
import store from '../stores/app'

/** The pending plugin listener registration, kept so that the listener can be removed on destroy. */
let listener: Promise<PluginListenerHandle> | null = null

/** Unsubscribes the store subscription that reports undo/redo availability to iOS. */
let unsubscribe: (() => void) | null = null

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
 */
const nativeHistory = {
  /** Subscribes to native history gestures and reports undo/redo availability. No-op outside the iOS Capacitor app, where no gesture is emitted. */
  init: () => {
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
    listener?.then(handle => handle.remove())
    listener = null
    unsubscribe?.()
    unsubscribe = null
  },
}

export default nativeHistory
