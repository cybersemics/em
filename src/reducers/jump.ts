import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import pathExists from '../selectors/pathExists'
import thoughtToPath from '../selectors/thoughtToPath'
import equalPathHead from '../util/equalPathHead'
import head from '../util/head'
import setCursor from './setCursor'

/** Move the cursor back to the nth last edit point. */
const jump = (state: State, { steps }: { steps: number } = { steps: 1 }): State => {
  const cursorLastEdit =
    state.jumpHistory
      .slice(steps - 1)
      // find the last edit point that still exists in the thoughtspace
      // ignore null cursor
      // ignore same thought
      // ignore deleted thought
      .find(cursor => cursor && !equalPathHead(cursor, state.cursor) && getThoughtById(state, head(cursor))) || null

  return setCursor(state, {
    path: cursorLastEdit
      ? // it is possible that the thought id exists but has been moved
        // in this case, reconstruct a SimplePath by traversing from the root
        !pathExists(state, cursorLastEdit)
        ? thoughtToPath(state, head(cursorLastEdit))
        : cursorLastEdit
      : null,
  })
}

export default jump
