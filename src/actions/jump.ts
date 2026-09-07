import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import equalPathHead from '../util/equalPathHead'
import head from '../util/head'
import setCursor from './setCursor'

/** Move the cursor back to the nth last edit point. */
const jump = (state: State, { steps }: { steps: number } = { steps: -1 }): State => {
  // do nothing if jumping 0 steps
  // do nothing if trying to jump forward but there is no jump index (i.e. we are already at the most recent edit)
  if (steps === 0 || (steps > 0 && state.jumpIndex === 0)) return state

  const lastJumpCursor = state.jumpHistory
    .slice(state.jumpIndex + steps + (steps > 0 ? -2 : 1))
    // find the last edit point that still exists in the thoughtspace
    // ignore null cursor
    // ignore same thought
    // ignore deleted thought
    .find(
      (cursor): cursor is Path =>
        !!cursor && !equalPathHead(cursor, state.cursor) && !!getThoughtById(state, head(cursor)),
    )

  // do nothing if no valid cursor was found
  // e.g. cannot go back any further
  if (lastJumpCursor === undefined) return state

  // The head thought exists (checked above) but may have been moved, so reconstruct the SimplePath by traversing
  // from the root rather than trusting the stored Path.
  const cursorNew = thoughtToPath(state, head(lastJumpCursor))

  return {
    ...setCursor(state, {
      path: cursorNew,
    }),
    jumpIndex: state.jumpIndex - steps,
  }
}

/** Action-creator for jump. */
export const jumpActionCreator =
  (steps = -1): Thunk =>
  dispatch =>
    dispatch({ type: 'jump', steps })

export default jump

// Register this action's metadata
registerActionMetadata('jump', {
  undoable: true,
  isNavigation: true,
})
