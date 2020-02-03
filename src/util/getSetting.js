import { store } from '../store.js'

import {
  EM_TOKEN,
} from '../constants.js'

import {
  getThoughtsRanked,
  isFunction,
} from '../util.js'

/** Returns non-function children of the given subthought in em/Settings/ */
export const getSetting = (context, { thoughtIndex = store.getState().thoughtIndex, contextIndex = store.getState().contextIndex, depth = 0 } = {}) =>
  getThoughtsRanked([EM_TOKEN, 'Settings'].concat(context), thoughtIndex, contextIndex)
    .filter(child => !isFunction(child.value))
    .map(child => child.value)
