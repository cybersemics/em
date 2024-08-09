import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import editingValueStore from '../stores/editingValue'
import head from '../util/head'
import isRoot from '../util/isRoot'

/** Asserts that the cursor thought is valid. */
const validateCursor = (state: State) => {
  const thought = state.cursor ? getThoughtById(state, head(state.cursor)) : null
  if (state.cursor && !thought) {
    const errorMessage = `Cursor thought does not exist: ${state.cursor}`
    console.error(errorMessage, {
      cursor: state.cursor,
    })
    throw new Error(errorMessage)
  } else if (state.cursor && isRoot(state.cursor)) {
    const errorMessage = `Cursor should be set to null, not [${HOME_TOKEN}]`
    console.error(errorMessage, {
      cursor: state.cursor,
    })
    throw new Error(errorMessage)
  }
}

/** The live editing value is stored in a separate ministore to avoid Redux store churn. When the cursor changes, update the editingValue store. */
const updateEditingValue = (state: State) => {
  const thought = state.cursor ? getThoughtById(state, head(state.cursor)) : null
  const value = thought?.value ?? null

  editingValueStore.update(value)
}

/** Manages side effects from the cursor changing. */
const cursorChangedMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)
    const state = getState()

    validateCursor(state)
    updateEditingValue(state)
  }
}

export default cursorChangedMiddleware
