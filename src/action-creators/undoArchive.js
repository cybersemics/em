import { store } from '../store'

// action-creators
import alert from '../action-creators/alert'

export const undoArchive = (originalPath, currPath, offset) => {

  const state = store.getState()

  // set the cursor to the original path before restoring the thought
  store.dispatch({
    type: 'setCursor',
    thoughtsRanked: originalPath,
    editing: state.editing,
    offset,
  })

  store.dispatch({
    type: 'existingThoughtMove',
    oldPath: currPath,
    newPath: originalPath,
    offset
  })

  // Hide the "Undo" alert
  alert(null)
}
