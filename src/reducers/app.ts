import { Action } from 'redux'
import * as reducers from './index'
import { State, initialState } from '../util/initialState'

/**
 * The main app reducer. Uses action.type to select the reducer with the same name. Otherwise throw an error with unknownAction.
 */
const appReducer = (state: State = initialState(), action: Action<string>) =>
  // @ts-ignore
  (reducers[action.type] || reducers.unknownAction)(state, action)

export default appReducer
