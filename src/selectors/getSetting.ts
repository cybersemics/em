import { EM_TOKEN } from '../constants'
import { isFunction } from '../util'
import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'
import { GenericObject } from '../utilTypes'

/** Cache localStorage settings. */
const localStorageSettingsCache = ['Tutorial', 'Tutorial Step'].reduce((accum, value) => ({
  ...accum,
  [value]: localStorage['Settings/' + value],
}), {} as GenericObject<string>)

/** Returns one of the localStorage Settings values that have been cached. */
const localCached = (context: Context | string) =>
  typeof context === 'string' ? localStorageSettingsCache[context] : undefined

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. */
const getStateSetting = (state: State, context: Context | string): string | undefined =>
  (getThoughtsRanked(state, [EM_TOKEN, 'Settings'].concat(context))
    .find(child => !isFunction(child.value)) || {}).value

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. Falls back to localStorage. */
const getSetting = (state: State, context: Context | string): string | undefined =>
  getStateSetting(state, context) ?? localCached(context)

export default getSetting
