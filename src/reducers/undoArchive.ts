import _ from 'lodash'
import { pathToContext, reducerFlow, rootedParentOf } from '../util'
import { getThoughts, getThoughtsRanked } from '../selectors'
import { alert, existingThoughtDelete, existingThoughtMove, setCursor } from '../reducers'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Moves the archived thought back to its original location. */
const undoArchive = (state: State, { originalPath, currPath, offset }: { originalPath: Path, currPath: Path, offset?: number }) => {

  const context = rootedParentOf(pathToContext(currPath))
  const archiveContext = rootedParentOf(pathToContext(originalPath))

  return reducerFlow([

    // set the cursor to the original path before restoring the thought
    state => setCursor(state, {
      path: originalPath,
      editing: state.editing,
      offset,
    }),

    // move thought out of archive
    existingThoughtMove({
      oldPath: currPath,
      newPath: originalPath,
      offset
    }),

    // delete =archive if empty
    state => getThoughts(state, context).length === 0
      ? existingThoughtDelete(state, {
        context: archiveContext,
        thoughtRanked: getThoughtsRanked(state, archiveContext)[0]
      })
      : state,

    // hide the undo alert
    alert({ value: null })

  ])(state)
}

export default _.curryRight(undoArchive)
