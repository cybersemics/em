import { pathToContext, reducerFlow, rootedContextOf } from '../util'
import { getThoughts, getThoughtsRanked } from '../selectors'
import { alert, existingThoughtDelete, existingThoughtMove, setCursor } from '../reducers'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Moves the archived thought back to its original location. */
const undoArchive = (state: State, { originalPath, currPath, offset }: { originalPath: Path, currPath: Path, offset?: number }) => {

  const context = rootedContextOf(pathToContext(currPath))
  const archiveContext = rootedContextOf(pathToContext(originalPath))

  return reducerFlow([

    // set the cursor to the original path before restoring the thought
    state => setCursor(state, {
      thoughtsRanked: originalPath,
      editing: state.editing,
      offset,
    }),

    // move thought out of archive
    state => existingThoughtMove(state, {
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
    state => alert(state, { value: null })

  ])(state)
}

export default undoArchive
