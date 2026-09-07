import State from '../@types/State'
import hashPath from '../util/hashPath'
import getSiblingPaths from './getSiblingPaths'

/** Returns true if the cursor and all its siblings are selected in the multicursor. */
const isAllSelected = (state: State): boolean => {
  const siblingPathHashes = getSiblingPaths(state).map(hashPath)
  const multicursorHashSet = new Set(Object.values(state.multicursors).map(hashPath))
  return (
    siblingPathHashes.length === multicursorHashSet.size &&
    siblingPathHashes.every(siblingPathHash => multicursorHashSet.has(siblingPathHash))
  )
}

export default isAllSelected
