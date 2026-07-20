import { startCase } from 'lodash'
import Patch from '../@types/Patch'
import { isNavigation } from './actionMetadata.registry'

/**
 * Recursively gets the latest user-facing action label from patch history.
 * Navigation patches are skipped so undo/redo alerts describe the command that caused the change.
 */
const getLatestActionLabel = (patchArr: Patch[], n = 1): string | undefined => {
  const patch = patchArr[patchArr.length - n]
  const lastActionType = patch?.[0]?.actions[0]
  if (!lastActionType) return undefined
  return isNavigation(lastActionType)
    ? getLatestActionLabel(patchArr, n + 1)
    : patch[0]?.undoLabel || startCase(lastActionType)
}

export default getLatestActionLabel
