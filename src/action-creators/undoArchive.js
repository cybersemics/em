// utils
import {
  pathToContext,
  rootedContextOf,
} from '../util'

// selectors
import {
  getThoughts,
  getThoughtsRanked,
} from '../selectors'

// action-creators
import alert from '../action-creators/alert'

export const undoArchive = ({ originalPath, currPath, offset }) => (dispatch, getState) => {

  const context = rootedContextOf(pathToContext(currPath))
  const archiveContext = rootedContextOf(pathToContext(originalPath))

  // set the cursor to the original path before restoring the thought
  dispatch({
    type: 'setCursor',
    thoughtsRanked: originalPath,
    editing: getState().editing,
    offset,
  })

  dispatch({
    type: 'existingThoughtMove',
    oldPath: currPath,
    newPath: originalPath,
    offset
  })

  // Check if =archive is empty
  if (getThoughts(getState(), context).length === 0) {
    dispatch({
      type: 'existingThoughtDelete',
      context: archiveContext,
      thoughtRanked: getThoughtsRanked(getState(), archiveContext)[0]
    })
  }

  // Hide the "Undo" alert
  alert(null)
}
