import { PluginListenerHandle } from '@capacitor/core'
import { WebviewBackground } from 'webview-background'
import { isCapacitor, isIOS } from '../browser'
import { handleNativeHistory } from '../commands'

/** The pending plugin listener registration, kept so that the listener can be removed on destroy. */
let listener: Promise<PluginListenerHandle> | null = null

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
 * manager that always reports undo and redo as available and emits `nativeHistory` instead of performing
 * them, so every gesture reaches em regardless of WebKit's stack. Since the gesture is then consumed
 * natively, no `beforeinput` is dispatched and the two routes cannot both fire for a single gesture.
 */
const nativeHistory = {
  /** Subscribes to native history gestures. No-op outside the iOS Capacitor app, where no gesture is emitted. */
  init: () => {
    if (!isCapacitor() || !isIOS || listener) return
    listener = WebviewBackground.addListener('nativeHistory', event => handleNativeHistory(event.type))
  },
  /** Unsubscribes from native history gestures. Removes the listener once registration resolves, so that a destroy that beats the pending registration still takes effect. */
  destroy: () => {
    listener?.then(handle => handle.remove())
    listener = null
  },
}

export default nativeHistory
