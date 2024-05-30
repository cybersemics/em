import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import storageModel from '../stores/storageModel'

/** Only write the jump history to localStorage every 1000 ms. */
const SAVE_THROTTLE = 1000

/** Saves the jump history to localStorage. */
const saveJumpHistory = _.throttle(
  (state: State) => {
    storageModel.set('jumpHistory', state.jumpHistory)
  },
  SAVE_THROTTLE,
  {
    leading: false,
  },
)

/** Updates the url history after the cursor has changed. The call to updateJumpHistory will short circuit if the cursor has not deviated from the current url. */
const updateJumpHistoryMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)
    saveJumpHistory(getState())
  }
}

export default updateJumpHistoryMiddleware
