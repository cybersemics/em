import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import head from '../util/head'
import { getChildren } from './getChildren'
import rootedParentOf from './rootedParentOf'

/** Returns true if the cursor and all its siblings are selected in the multicursor. */
const isAllSelected = (state: State): boolean => {
  const { cursor } = state
  const parentId = cursor ? head(rootedParentOf(state, cursor)) : HOME_TOKEN
  const childrenIds = getChildren(state, parentId).map(child => child.id)
  // ignore order
  const multicursorIdSet = new Set(Object.values(state.multicursors).map(path => head(path)))
  return childrenIds.length === multicursorIdSet.size && childrenIds.every(childId => multicursorIdSet.has(childId))
}

export default isAllSelected
