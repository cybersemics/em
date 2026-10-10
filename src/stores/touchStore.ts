import ministore from './ministore'

/** State of the current touch, read by touch and cursor handlers on every event. A ministore rather than mutable globals so that resetStores clears it between tests; nothing subscribes, so a write never renders. */
const touchStore = ministore({
  /** Set when the current press landed on the caret, i.e. the user is reaching for native caret repositioning rather
   * than starting a drag or a gesture: on iOS Safari the text magnifier, on any caret; elsewhere only on an empty
   * thought, where the context menu is the only route to paste. Set by the capture-phase touchstart listener in
   * initEvents and cleared on touchend, so its lifetime is the press. Read by useLongPress (both the press itself and
   * the context menu it would suppress), canDrag, and shouldCancelGesture — react-dnd's own timer can begin a drag
   * without going through the long press state machine. */
  pressOnCaret: false,
  /** Set on iOS 27 when the current press landed inside the editable of an empty thought being edited, within about
   * 3em of its caret. A tap there
   * gets no mouse events and cannot move the caret, so when WebKit withholds its touchend, nothing tells useLongPress
   * that the finger lifted (#5660). Set and cleared alongside pressOnCaret, and read by useLongPress and canDrag, but
   * not by shouldCancelGesture: a gesture over a new thought's placeholder is common. */
  pressInEmptyThought: false,
  /** Whether the user is touchmoving, so that a touchend can be told apart from a tap or a drag. Not related to react-dnd. */
  touching: false,
  /** Set when a completed touch has already handled its intended cursor behavior, and cleared on the next touchstart. While set, cursor-producing events on an editable belong to the completed touch: browsers can synthesize them after touchend called preventDefault, or after drag cleanup has finished. A legitimate tap always begins with a new touchstart, which clears the flag first. */
  suppressCursorAfterTouch: false,
})

export default touchStore
