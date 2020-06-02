// utils
import {
  pathToContext,
  reducerFlow,
  rootedContextOf,
} from '../util'

// selectors
import {
  getThoughts,
  getThoughtsRanked,
} from '../selectors'

// reducers
import setCursor from './setCursor'
import existingThoughtMove from './existingThoughtMove'
import existingThoughtDelete from './existingThoughtDelete'
import alert from './alert'

/** Moves the archived thought back to its original location. */
export default (state, { originalPath, currPath, offset }) => {

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
