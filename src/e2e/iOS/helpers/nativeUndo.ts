/**
 * Performs a native undo, as the iOS three-finger swipe, shake-to-undo, and the Edit menu do.
 *
 * WebKit dispatches the same cancelable `historyUndo` `beforeinput` event for `document.execCommand('undo')` as it
 * does for the gesture, and only while its own undo stack has a step to undo. Exercising the gesture's real delivery
 * path this way also covers the case where WebKit finds nothing to undo, swallows the gesture, and reports "Nothing
 * to Undo" itself instead of handing it to em.
 */
const nativeUndo = () => browser.execute(() => document.execCommand('undo'))

export default nativeUndo
