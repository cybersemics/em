import { store } from '../store'

// action-creators
import alert from '../action-creators/alert'

export const undoArchive = ({ originalPath, currPath, offset }) => dispatch => {

  const state = store.getState()

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

  // Hide the "Undo" alert
  alert(null)
}
