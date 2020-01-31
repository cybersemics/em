// import {
//   EM_TOKEN,
// } from '../constants.js'

import {
  isFunction,
  getThoughtsRanked,
} from '../util.js'

export const getSettings = selector =>
  // TODO: Fix floating contexts
  getThoughtsRanked([/*EM_TOKEN, */'Settings'].concat(selector ? selector.split('.') : []))
    .filter(child => !isFunction(child.value))
    .map(child => child.value)
