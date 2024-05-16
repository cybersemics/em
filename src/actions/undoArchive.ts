import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import deleteThought from '../actions/deleteThought'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import { getAllChildren, getChildrenRanked } from '../selectors/getChildren'
import rootedParentOf from '../selectors/rootedParentOf'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Moves the archived thought back to its original location. */
const undoArchive = (
  state: State,
  { originalPath, currPath, offset }: { originalPath: Path; currPath: Path; offset?: number },
) => {
  const parentId = head(rootedParentOf(state, currPath))
  const originalParentId = head(rootedParentOf(state, originalPath))

  return reducerFlow([
    // set the cursor to the original path before restoring the thought
    state =>
      setCursor(state, {
        path: originalPath,
        editing: state.editing,
        offset,
      }),

    // move thought out of archive
    moveThought({
      oldPath: currPath,
      newPath: originalPath,
      offset,
      // @MIGRATION_TODO: Fix rank here
      newRank: 0,
    }),

    // delete =archive if empty
    state =>
      !parentId || getAllChildren(state, parentId).length === 0
        ? deleteThought(state, {
            pathParent: rootedParentOf(state, originalPath),
            thoughtId: getChildrenRanked(state, originalParentId)[0].id,
          })
        : state,

    // hide the undo alert
    alert({ value: null }),
  ])(state)
}

/** Action-creator for undoArchive. */
export const undoArchiveActionCreator =
  (payload: Parameters<typeof undoArchive>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'undoArchive', ...payload })

export default _.curryRight(undoArchive)
