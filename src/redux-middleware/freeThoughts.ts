import _ from 'lodash'
import { isAction } from 'redux'
import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { Thunk } from '../@types/Thunk'
import { freeThoughtsActionCreator as freeThoughts } from '../actions/freeThoughts'
import { FREE_THOUGHTS_THROTTLE } from '../constants'
import globals from '../globals'

/** Checks if the thought cache has exceeded its memory limit. If so, dispatches freeThoughts which frees Redux indexes and provider cache. */
const checkThreshold: Thunk = (dispatch, getState): void => {
  const state = getState()
  if (Object.keys(state.thoughts.thoughtIndex).length > globals.freeThoughtsThreshold) {
    dispatch(freeThoughts())
  }
}

const checkThrottled = _.throttle(checkThreshold, FREE_THOUGHTS_THROTTLE, { leading: false })

/** Runs a throttled session keepalive on every action. */
const freeThoughtsMiddleware: ThunkMiddleware<State> = ({ dispatch, getState }) => {
  return next => action => {
    next(action)

    // do not run checkThrottled on freeThoughts action to avoid infinite loop
    if (isAction(action) && action.type !== 'freeThoughts') {
      checkThrottled(dispatch, getState)
    }
  }
}

export default freeThoughtsMiddleware
