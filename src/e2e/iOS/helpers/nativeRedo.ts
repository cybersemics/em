/**
 * Performs a native redo, as the iOS three-finger swipe and shake-to-undo do.
 *
 * The counterpart of nativeUndo: WebKit dispatches the same cancelable `historyRedo` `beforeinput` event for
 * `document.execCommand('redo')` as it does for the gesture, and only while its own undo stack has a step to redo.
 */
const nativeRedo = () => browser.execute(() => document.execCommand('redo'))

export default nativeRedo
