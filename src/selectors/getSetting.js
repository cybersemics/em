import { store } from '../store'

import {
  EM_TOKEN,
} from '../constants'

import {
  isFunction,
} from '../util'

import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts */
// TODO: I have passes state everywhere from getSetting is calling but still getting undefined in some cases so the temp hack is store.getState()
export default (state = store.getState(), context, depth = 0) =>
  (getThoughtsRanked(state, [EM_TOKEN, 'Settings'].concat(context))
    .find(child => !isFunction(child.value)) || {}).value
