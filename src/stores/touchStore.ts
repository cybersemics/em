import ministore from './ministore'

/** State of the current touch, read by touch and cursor handlers on every event. A ministore rather than mutable globals so that resetStores clears it between tests; nothing subscribes, so a write never renders. */
const touchStore = ministore({
  /** Whether the user is touchmoving, so that a touchend can be told apart from a tap or a drag. Not related to react-dnd. */
  touching: false,
  /** Set when a completed touch has already handled its intended cursor behavior, and cleared on the next touchstart. While set, cursor-producing events on an editable belong to the completed touch: browsers can synthesize them after touchend called preventDefault, or after drag cleanup has finished. A legitimate tap always begins with a new touchstart, which clears the flag first. */
  suppressCursorAfterTouch: false,
})

export default touchStore
