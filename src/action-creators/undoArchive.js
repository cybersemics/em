import { store } from '../store'

import {
  contextOf,
  head,
  pathToContext,
  splice,
} from '../util'

// action-creators
import alert from '../action-creators/alert'

export const undoArchive = ({ originalPath, currPath, offset }) => dispatch => {

  const state = store.getState()

  const restoredThought = head(currPath)

  const currContext = contextOf(pathToContext(currPath))

  // set the cursor to the original path before restoring the thought
  dispatch({
    type: 'setCursor',
    thoughtsRanked: originalPath,
    editing: state.editing,
    offset,
  })

  dispatch({
    type: 'existingThoughtMove',
    oldPath: splice(currPath, currPath.length - 1, 1).concat({ value: restoredThought.value, rank: restoredThought.originalRank }),
    newPath: originalPath,
    offset
  })

  dispatch({
    type: 'existingThoughtDelete',
    context: currContext,
    thoughtRanked: head(currPath)
  })

  // Hide the "Undo" alert
  alert(null)
}
