import { store } from '../store'

// utils
import {
  contextOf,
  getThoughtsRanked,
  head,
  pathToContext,
  rankThoughtsFirstMatch,
  splice,
} from '../util'

// action-creators
import alert from '../action-creators/alert'

export const undoArchive = ({ originalPath, currPath, offset }) => dispatch => {

  const state = store.getState()

  const archiveContext = contextOf(pathToContext(currPath))
  const contextOfArchive = splice(archiveContext, archiveContext.length - 1, 1)

  // set the cursor to the original path before restoring the thought
  dispatch({
    type: 'setCursor',
    thoughtsRanked: originalPath,
    editing: state.editing,
    offset,
  })

  dispatch({
    type: 'existingThoughtMove',
    oldPath: currPath,
    newPath: originalPath,
    offset
  })

  if (getThoughtsRanked(archiveContext).length === 0) {
    dispatch({
      type: 'existingThoughtDelete',
      context: contextOfArchive,
      thoughtRanked: head(rankThoughtsFirstMatch(archiveContext))
    })
  }

  // Hide the "Undo" alert
  alert(null)
}
