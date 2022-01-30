import { Patch } from '../@types'
import { NAVIGATION_ACTIONS } from '../constants'

/**
 * Recursively calculates last action type from inversePatches history if it is one of the navigation actions and finally returns the action.
 * Returns undefined if there is no navigation actions in inversePatches.
 */
export const getLatestActionType = (inversePatches: Patch[], n = 1): string | undefined => {
  const lastActionType = inversePatches[inversePatches.length - n]?.[0]?.actions[0]
  if (NAVIGATION_ACTIONS[lastActionType]) return getLatestActionType(inversePatches, n + 1)
  return lastActionType
}
