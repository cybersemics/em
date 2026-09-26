import ministore from './ministore'

/** Time of the last native undo/redo gesture that `device/nativeHistory.ts` detected from touch events. The same three-finger swipe is also reported by iOS as a `historyUndo`/`historyRedo` `beforeinput` a moment later, so `beforeInput` reads this to avoid applying one gesture twice. A ministore rather than a mutable global so that resetStores clears it between tests; nothing subscribes, so a write never renders. */
const nativeHistoryGestureStore = ministore(-Infinity)

export default nativeHistoryGestureStore
