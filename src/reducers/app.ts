import { Action } from 'redux'
import * as reducers from './index'
import { State, initialState } from '../util/initialState'
import { Index } from '../types'

/**
 * The main app reducer. Uses action.type to select the reducer with the same name. Otherwise throw an error with unknownAction.
 */
const appReducer = (state: State = initialState(), action: Action<string>): State =>
  ((reducers as Index<any>)[action.type] || reducers.unknownAction)(state, action)

export default appReducer
