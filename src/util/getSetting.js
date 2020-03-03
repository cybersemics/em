import { store } from '../store.js'

import {
  EM_TOKEN,
} from '../constants.js'

import {
  getThoughtsRanked,
  isFunction,
} from '../util.js'

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts */
export const getSetting = (context, { thoughtIndex = store.getState().present.thoughtIndex, contextIndex = store.getState().present.contextIndex, depth = 0 } = {}) =>
  getThoughtsRanked([EM_TOKEN, 'Settings'].concat(context), thoughtIndex, contextIndex)
    .filter(child => !isFunction(child.value))
    .map(child => child.value)
