import ministore from './ministore'

/** State of the current touch, read by touch and cursor handlers on every event. A ministore rather than mutable globals so that resetStores clears it between tests; nothing subscribes, so a write never renders. */
const touchStore = ministore({
  /** Whether the user is touchmoving, so that a touchend can be told apart from a tap or a drag. Not related to react-dnd. */
  touching: false,
  /** Set when a completed touch has already handled its intended cursor behavior, and cleared on the next touchstart. While set, cursor-producing events on an editable belong to the completed touch: browsers can synthesize them after touchend called preventDefault, or after drag cleanup has finished. A legitimate tap always begins with a new touchstart, which clears the flag first. */
  suppressCursorAfterTouch: false,
  /** The timeStamp of the last touchend, so that the next touchstart can tell whether that touchend was withheld. */
  touchEndTimeStamp: -Infinity,
  /** Milliseconds from the last touchend to the touchstart that followed it, so that the touchstart after that can tell whether the two touches before it were a double tap. */
  touchGap: Infinity,
  /** Set on touchstart when the touch's touchend may be withheld, and cleared on the next touchstart. After a double tap on the caret of an editable, iOS 27 stops dispatching touchend and pointerup at the end of later taps, and flushes them only when the next touch begins (#5660). A tap then looks exactly like a finger still held down, so while this is set a touch must not start a long press. */
  touchEndUnreliable: false,
})

export default touchStore
