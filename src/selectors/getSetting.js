import {
  EM_TOKEN,
} from '../constants'

import {
  isFunction,
} from '../util'

import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts */
export default (state, context, depth = 0) =>
  (getThoughtsRanked(state, [EM_TOKEN, 'Settings'].concat(context))
    .find(child => !isFunction(child.value)) || {}).value
