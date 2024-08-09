import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import editingValueStore from '../stores/editingValue'
import head from '../util/head'

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

    updateEditingValue(state)
  }
}

export default cursorChangedMiddleware
