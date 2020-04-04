import { store } from '../store'

import {
  EM_TOKEN,
} from '../constants'

import {
  getThoughtsRanked,
  isFunction,
} from '../util.js'

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts */
export const getSetting = (context, state = store.getState(), depth = 0) =>
  (getThoughtsRanked([EM_TOKEN, 'Settings'].concat(context), state.thoughtIndex, state.contextIndex)
    .find(child => !isFunction(child.value)) || {}).value
