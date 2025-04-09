import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import Path from '../@types/Path'
import State from '../@types/State'
import storageModel from '../stores/storageModel'
import equalPath from '../util/equalPath'
import parentOf from '../util/parentOf'

// maximum size of state.jumpHistory
const MAX_JUMPS = 100

/** Only write the jump history to localStorage every 1000 ms. */
const SAVE_THROTTLE = 1000

/** A reducer that prepends the cursor to the the jump history. If the cursor is the same as the last jump point, does nothing. If the cursor is adjacent to the last jump point (parent, child, or sibling of), then it replaces the last jump point. See actions/jump.ts and State.jumpHistory. */
const updateJumpHistory = (state: State): State => {
  const lastJump = state.jumpHistory[0]
  const lastJumpParent = lastJump ? parentOf(lastJump) : null
  const cursorParent = state.cursor ? parentOf(state.cursor) : null

  /** Returns true if the cursor is the parent, child, or sibling of the last jump point. When this is true, the cursor will replace the last jump history entry rather than appending to it, thus preserving only the last edit cursor among a group of proximal edits. */
  const isAdjacent = () =>
    !!state.cursor &&
    state.cursor.length > 0 &&
    !!lastJump &&
    lastJump.length > 0 &&
    // parent
    (equalPath(lastJumpParent, state.cursor) ||
      // child
      equalPath(lastJump, cursorParent) ||
      // sibling
      equalPath(lastJumpParent, cursorParent))

  // append old cursor to jump history if different
  // replace last jump if adjacent
  // limit to MAX_JUMPS
  // See: State.jumpHistory
  return lastJump !== state.cursor
    ? {
        ...state,
        jumpHistory: [state.cursor, ...state.jumpHistory.slice(isAdjacent() ? 1 : 0, MAX_JUMPS)],
        jumpIndex: 0,
      }
    : state
}

/** Saves the jump history to localStorage. */
const saveJumpHistory = _.throttle(
  (jumpHistory: (Path | null)[]) => {
    storageModel.set('jumpHistory', jumpHistory)
  },
  SAVE_THROTTLE,
  {
    leading: false,
  },
)

/** Update the jump history whenever thoughts change. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateJumpHistoryEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> =>
    createStore((state: State | undefined, action: A): State => {
      const stateNew: State = reducer(state, action)

      // Do not update the jumpHistory on freeThoughts, otherwise jumpIndex will get reset to 0 on jumpBack, preventing more than a single jump.
      if (action.type !== 'freeThoughts' && stateNew.thoughts.thoughtIndex !== state?.thoughts.thoughtIndex) {
        const stateWithJumpHistory = updateJumpHistory(stateNew)
        saveJumpHistory(stateWithJumpHistory.jumpHistory)
        return stateWithJumpHistory
      } else {
        return stateNew
      }
    }, initialState)

export default updateJumpHistoryEnhancer
