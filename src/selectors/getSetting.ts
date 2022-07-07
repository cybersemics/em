import Context from '../@types/Context'
import State from '../@types/State'
import { EM_TOKEN } from '../constants'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'
import storage from '../util/storage'

/** Cache localStorage settings. */
const localStorageSettingsCache = keyValueBy(['Tutorial', 'Tutorial Step'], value => ({
  [value]: typeof storage !== 'undefined' ? (storage.getItem('Settings/' + value) as string) : undefined,
}))

/** Returns one of the localStorage Settings values that have been cached. */
const localCached = (context: Context | string) =>
  typeof context === 'string' ? localStorageSettingsCache[context] : undefined

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. */
const getStateSetting = (state: State, context: Context | string): string | undefined => {
  const id = contextToThoughtId(state, [EM_TOKEN, 'Settings'].concat(context))
  return (getChildrenRanked(state, id).find(child => !isAttribute(child.value)) || {}).value
}

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. Falls back to localStorage. */
const getSetting = (state: State, context: Context | string): string | undefined =>
  getStateSetting(state, context) ?? localCached(context)

export default getSetting
