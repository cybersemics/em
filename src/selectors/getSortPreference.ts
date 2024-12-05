import SortDirection from '../@types/SortDirection'
import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import { getAllChildrenAsThoughts } from './getChildren'
import getGlobalSortPreference from './getGlobalSortPreference'

/**
 * Get sort direction if given sort type is not 'None'.
 */
const getSortDirection = (sortType: string, state: State, sortId: ThoughtId): SortDirection | null => {
  if (sortType === 'None') return null

  // Start from sortId and look for the sortType
  const sortTypeId = findDescendant(state, sortId, [sortType])
  if (!sortTypeId) return 'Asc'

  const childrenSortDirection = getAllChildrenAsThoughts(state, sortTypeId)
  const directionChild = childrenSortDirection.find(child => child.value === 'Desc' || child.value === 'Asc')

  return directionChild ? (directionChild.value as SortDirection) : 'Asc'
}

/** Find the parent ID of a given thought ID. */
const findParentId = (state: State, thoughtId: ThoughtId): ThoughtId | null => {
  const thought = getThoughtById(state, thoughtId)
  return thought ? thought.parentId : null
}

/** Get the sort setting from the given context meta or, if not provided, the global sort. */
const getSortPreference = (state: State, id: ThoughtId): SortPreference => {
  // Attempt to find '=sort' under the current id
  let sortId = findDescendant(state, id, ['=sort'])
  let childrenSort = sortId ? getAllChildrenAsThoughts(state, sortId) : []

  // If '=sort' not found or has no children, check the immediate parent
  if ((!sortId || childrenSort.length === 0) && id !== '__ROOT__') {
    const parentId = findParentId(state, id)
    if (parentId && parentId !== id) {
      sortId = findDescendant(state, parentId, ['=sort'])
      if (sortId) {
        childrenSort = getAllChildrenAsThoughts(state, sortId)
      }
    }
  }

  // If still not found, fallback to global sort preference
  if (!sortId || childrenSort.length === 0) {
    return getGlobalSortPreference(state)
  }

  // Return the sort preference found
  return {
    type: childrenSort[0].value,
    direction: getSortDirection(childrenSort[0].value, state, sortId),
  }
}

export default getSortPreference
