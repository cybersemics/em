import * as reducers from './index'
import { initialState } from '../util'

/**
 * The main app reducer. Uses action.type to select the reducer with the same name. Otherwise throw an error with unknownAction.
 */
const appReducer = (state = initialState(), action) =>
  (reducers[action.type] || reducers.unknownAction)(state, action)

export default appReducer
