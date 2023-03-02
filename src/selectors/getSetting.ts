import moize from 'moize'
import Context from '../@types/Context'
import State from '../@types/State'
import { CACHED_SETTINGS, EM_TOKEN } from '../constants'
import { tsidShared } from '../data-providers/yjs'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getAllChildren } from '../selectors/getChildren'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'
import { resolveArray } from '../util/memoizeResolvers'
import storage from '../util/storage'
import getThoughtById from './getThoughtById'

/** Cache localStorage settings. */
const localStorageSettingsCache = keyValueBy(CACHED_SETTINGS, name => ({
  [name]: typeof storage !== 'undefined' ? (storage.getItem('Settings/' + name) as string) : undefined,
}))

// disable tutorial if the thoughtspace was shared
if (!localStorageSettingsCache.Tutorial && tsidShared) {
  localStorageSettingsCache.Tutorial = 'Off'
  storage.setItem('Settings/Tutorial', 'Off')
}

/** Returns one of the localStorage Settings values that have been cached. */
const localCached = (context: Context | string) =>
  typeof context === 'string' ? localStorageSettingsCache[context] : undefined

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. Returns undefined if the setting has no subthoughts. */
const getStateSetting = (state: State, context: Context | string): string | undefined => {
  const id = contextToThoughtId(state, [EM_TOKEN, 'Settings'].concat(context))
  const valueId = getAllChildren(state, id).find(childId => {
    const child = getThoughtById(state, childId)
    return child && !isAttribute(child.value)
  })
  return valueId && getThoughtById(state, valueId).value
}

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. Falls back to localStorage. */
const getSetting = (state: State, context: Context | string): string | undefined =>
  getStateSetting(state, context) ?? localCached(context)

/** Memoize getSettings by thoughtIndex and context. */
const getSettingMemoized = moize(getSetting, {
  maxSize: 1000,
  profileName: 'getSetting',
  transformArgs: ([state, context]) => [
    state.thoughts.thoughtIndex,
    typeof context === 'string' ? context : resolveArray(context),
  ],
})

export default getSettingMemoized
