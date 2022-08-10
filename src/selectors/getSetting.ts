import moize from 'moize'
import Context from '../@types/Context'
import State from '../@types/State'
import { EM_TOKEN } from '../constants'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getAllChildren } from '../selectors/getChildren'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'
import { resolveArray } from '../util/memoizeResolvers'
import storage from '../util/storage'
import getThoughtById from './getThoughtById'

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
