import { Patch } from '../@types'
import { NAVIGATION_ACTIONS } from '../constants'

/**
 * Recursively calculates last action type from patches/inversePatches history if it is one of the navigation actions and finally returns the action.
 * Returns undefined if there is no navigation actions in patches/inversePatches.
 */
export const getLatestActionType = (patchArr: Patch[], n = 1): string | undefined => {
  const lastActionType = patchArr[patchArr.length - n]?.[0]?.actions[0]
  if (NAVIGATION_ACTIONS[lastActionType]) return getLatestActionType(patchArr, n + 1)
  return lastActionType
}
