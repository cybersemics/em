import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import pathToThought from '../selectors/pathToThought'
import editingValueStore from '../stores/editingValue'

/** The live editing value is stored in a separate ministore to avoid Redux store churn. Update the editingValue store on every action. */
const updateEditingValue: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    const state = getState()
    // the displayed thought, i.e. the context in the context view, since that is the thought Editable edits
    const thought = state.cursor ? pathToThought(state, state.cursor) : null
    const value = thought?.value ?? null

    editingValueStore.update(value)
  }
}

export default updateEditingValue
