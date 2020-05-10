import { store } from '../store'

import {
  head,
  splice,
} from '../util'

// action-creators
import alert from '../action-creators/alert'

export const undoArchive = ({ originalPath, currPath, offset }) => dispatch => {

  const state = store.getState()

  const restoredThought = head(currPath)

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

  // Hide the "Undo" alert
  alert(null)
}
