import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import State from '../@types/State'
import dehydrateContextPath from '../selectors/dehydrateContextPath'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import storageModel from '../stores/storageModel'
import equalPath from '../util/equalPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

// maximum size of state.jumpHistory
const MAX_JUMPS = 100

/** Only write the jump history to localStorage every 1000 ms. */
const SAVE_THROTTLE = 1000

/** A reducer that prepends the cursor to the the jump history. If the cursor is the same as the last jump point, does nothing. If the cursor is adjacent to the last jump point (parent, child, or sibling of), then it replaces the last jump point. See actions/jump.ts and State.jumpHistory. */
const updateJumpHistory = (state: State): State => {
  const serialized = dehydrateContextPath(state, state.cursor)
  const cursor = serialized.path
  const lastJump = state.jumpHistory[0]
  const lastJumpParent = lastJump ? parentOf(lastJump) : null
  const cursorParent = cursor ? parentOf(cursor) : null

  /** Returns true if the cursor is the parent, child, or sibling of the last jump point. When this is true, the cursor will replace the last jump history entry rather than appending to it, thus preserving only the last edit cursor among a group of proximal edits. */
  const isAdjacent = () =>
    !!cursor &&
    cursor.length > 0 &&
    !!lastJump &&
    lastJump.length > 0 &&
    // parent
    (equalPath(lastJumpParent, cursor) ||
      // child
      equalPath(lastJump, cursorParent) ||
      // sibling
      equalPath(lastJumpParent, cursorParent))

  // append old cursor to jump history if different
  // replace last jump if adjacent
  // limit to MAX_JUMPS
  // See: State.jumpHistory
  return (serialized.unfolded ? !equalPath(lastJump, cursor) : lastJump !== cursor)
    ? {
        ...state,
        jumpHistory: [cursor, ...state.jumpHistory.slice(isAdjacent() ? 1 : 0, MAX_JUMPS)],
        jumpIndex: 0,
      }
    : state
}

/** Saves the jump history to localStorage. */
const saveJumpHistory = _.throttle(
  (state: State) => {
    // Jump restores a surviving thought from its head ID, so stored route ancestry is unnecessary.
    // New unfolded edit points are already canonical before their registry can close. Older unloaded targets
    // retain their existing path: cache eviction is not deletion, and Jump can load them again later.
    storageModel.set(
      'jumpHistory',
      state.jumpHistory.map(path =>
        path && getThoughtById(state, head(path)) ? thoughtToPath(state, head(path)) : path,
      ),
    )
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
        saveJumpHistory(stateWithJumpHistory)
        return stateWithJumpHistory
      } else {
        return stateNew
      }
    }, initialState)

export default updateJumpHistoryEnhancer
