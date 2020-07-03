import { EM_TOKEN } from '../constants'
import { isFunction } from '../util'
import { getThoughtsRanked } from '../selectors'
import { Context } from '../types'
import { State } from '../util/initialState'

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. */
const getSetting = (state: State, context: Context | string) =>
  (getThoughtsRanked(state, [EM_TOKEN, 'Settings'].concat(context))
    .find(child => !isFunction(child.value)) || {}).value

export default getSetting
