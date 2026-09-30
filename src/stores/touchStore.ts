import ministore from './ministore'

/** State of the current touch, read by touch and cursor handlers on every event. A ministore rather than mutable globals so that resetStores clears it between tests; nothing subscribes, so a write never renders. */
const touchStore = ministore({
  /** Set when the current press landed on the caret, i.e. the user is reaching for the iOS text magnifier rather than
   * starting a drag or a gesture. Only ever set on iOS Safari (including the Capacitor WKWebView); Android's caret
   * handle sits outside the editable and its drag-and-drop is unaffected. Set by the capture-phase touchstart listener
   * in initEvents and cleared on touchend, so its lifetime is the press. Read by useLongPress, canDrag, and
   * shouldCancelGesture — react-dnd's own timer can begin a drag without going through the long press state machine. */
  pressOnCaret: false,
  /** Whether the user is touchmoving, so that a touchend can be told apart from a tap or a drag. Not related to react-dnd. */
  touching: false,
  /** Set when a completed touch has already handled its intended cursor behavior, and cleared on the next touchstart. While set, cursor-producing events on an editable belong to the completed touch: browsers can synthesize them after touchend called preventDefault, or after drag cleanup has finished. A legitimate tap always begins with a new touchstart, which clears the flag first. */
  suppressCursorAfterTouch: false,
  /** The timeStamp of the last touchend, so that the next touchstart can tell whether that touchend was withheld. */
  touchEndTimeStamp: -Infinity,
  /** The timeStamp of the last touchstart, so that the next touchstart can tell whether the two are a double tap. */
  touchStartTimeStamp: -Infinity,
  /** Whether the last touch has ended. Cleared on touchstart and set on touchend, so that a click can tell whether it arrived before its touch's touchend, which iOS 27 can withhold (#5660). */
  touchEnded: true,
  /** Set from the mousedown to the mouseup or click that iOS fires for a touch whose touchend has not arrived, i.e. while iOS is still placing the caret for a tap whose touchend it withheld (#5660). Setting the selection in this window would override that caret with the start of the thought. Cleared on every touchstart and touchend. */
  nativeTapPending: false,
  /** Set on touchstart when this touch's touchend may be withheld, and recomputed on the next touchstart. Such a tap looks exactly like a finger still held down, so while this is set the touch must not start a long press. */
  touchEndUnreliable: false,
})

export default touchStore
