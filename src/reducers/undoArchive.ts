import _ from 'lodash'
import { pathToContext, reducerFlow } from '../util'
import { getAllChildren, getChildrenRanked, rootedParentOf } from '../selectors'
import { alert, deleteThought, moveThought, setCursor } from '../reducers'
import { Path, State } from '../@types'

/** Moves the archived thought back to its original location. */
const undoArchive = (
  state: State,
  { originalPath, currPath, offset }: { originalPath: Path; currPath: Path; offset?: number },
) => {
  const context = rootedParentOf(state, pathToContext(state, currPath))
  const archiveContext = rootedParentOf(state, pathToContext(state, originalPath))

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
      getAllChildren(state, context).length === 0
        ? deleteThought(state, {
            context: archiveContext,
            thoughtId: getChildrenRanked(state, archiveContext)[0].id,
          })
        : state,

    // hide the undo alert
    alert({ value: null }),
  ])(state)
}

export default _.curryRight(undoArchive)
