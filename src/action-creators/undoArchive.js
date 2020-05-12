import { store } from '../store'

// utils
import {
  contextOf,
  head,
  pathToContext,
  splice,
} from '../util'

// selectors
import {
  getThoughtsRanked,
  rankThoughtsFirstMatch,
} from '../selectors'

// action-creators
import alert from '../action-creators/alert'

export const undoArchive = ({ originalPath, currPath, offset }) => dispatch => {

  const { getState } = store

  const archiveContext = contextOf(pathToContext(currPath))
  const contextOfArchive = splice(archiveContext, archiveContext.length - 1, 1)

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

  if (getThoughtsRanked(getState(), archiveContext).length === 0) {
    dispatch({
      type: 'existingThoughtDelete',
      context: contextOfArchive,
      thoughtRanked: head(rankThoughtsFirstMatch(getState(), archiveContext))
    })
  }

  // Hide the "Undo" alert
  alert(null)
}
