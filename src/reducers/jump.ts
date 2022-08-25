import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import pathExists from '../selectors/pathExists'
import thoughtToPath from '../selectors/thoughtToPath'
import head from '../util/head'
import setCursor from './setCursor'

/** Returns true if the heads of two Paths are the same. Returns true if both Paths are null, and false if only one is null. */
const equalPathHead = (path1: Path | null, path2: Path | null) =>
  path1 === path2 || (path1 && path2 && head(path1) === head(path2))

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
