import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import editingValueStore from '../stores/editingValue'
import head from '../util/head'

/** The live editing value is stored in a separate ministore to avoid Redux store churn. Update the editingValue store on every action. */
const updateEditingValue: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    const state = getState()
    const thought = state.cursor ? getThoughtById(state, head(state.cursor)) : null
    const value = thought?.value ?? null

    editingValueStore.update(value)
  }
}

export default updateEditingValue
