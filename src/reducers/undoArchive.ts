import _ from 'lodash'
import { Path, State } from '../@types'
import { alert, deleteThought, moveThought, setCursor } from '../reducers'
import { getAllChildren, getChildrenRanked, rootedParentOf } from '../selectors'
import { pathToContext, reducerFlow } from '../util'

/** Moves the archived thought back to its original location. */
const undoArchive = (
  state: State,
  { originalPath, currPath, offset }: { originalPath: Path; currPath: Path; offset?: number },
) => {
  const context = rootedParentOf(state, pathToContext(currPath))
  const archiveContext = rootedParentOf(state, pathToContext(originalPath))

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
    }),

    // delete =archive if empty
    state =>
      getAllChildren(state, context).length === 0
        ? deleteThought(state, {
            context: archiveContext,
            thoughtRanked: getChildrenRanked(state, archiveContext)[0],
          })
        : state,

    // hide the undo alert
    alert({ value: null }),
  ])(state)
}

export default _.curryRight(undoArchive)
