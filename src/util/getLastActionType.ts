import Patch from '../@types/Patch'

/**
 * Recursively skips navigation-only patches and returns the source id of the latest undoable patch.
 */
const getLatestActionType = (patchArr: Patch[], n = 1): string | undefined => {
  const patch = patchArr[patchArr.length - n]
  if (!patch) return undefined
  if (patch.metadata.isNavigation) return getLatestActionType(patchArr, n + 1)
  return patch.metadata.source === 'command'
    ? patch.metadata.label
    : (patch.metadata.label ?? patch.metadata.actionType)
}

export default getLatestActionType
