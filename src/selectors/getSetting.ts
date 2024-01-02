import moize from 'moize'
import Context from '../@types/Context'
import State from '../@types/State'
import { EM_TOKEN } from '../constants'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getAllChildren } from '../selectors/getChildren'
import isAttribute from '../util/isAttribute'
import { resolveArray } from '../util/memoizeResolvers'
import getThoughtById from './getThoughtById'

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. Returns undefined if the setting has no subthoughts. */
export const getStateSetting = (state: State, context: Context | string): string | undefined => {
  const id = contextToThoughtId(state, [EM_TOKEN, 'Settings'].concat(context))
  const valueId = getAllChildren(state, id).find(childId => {
    const child = getThoughtById(state, childId)
    return child && !isAttribute(child.value)
  })
  return valueId && getThoughtById(state, valueId).value
}

/** Returns subthoughts of /em/Settings/...context, not including meta subthoughts. Falls back to localStorage. */
const getSetting = (state: State, context: Context | string): string | undefined => {
  const value = getStateSetting(state, context)
  if (value != null) return value

  return context === 'Tutorial'
    ? state.storageCache?.tutorialComplete
      ? 'Off'
      : 'On'
    : context === 'Tutorial Step'
      ? state.storageCache?.tutorialStep?.toString() || '1'
      : undefined
}

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
