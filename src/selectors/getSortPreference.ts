import SortPreference from '../@types/SortPreference'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import parseSortDirection from '../util/parseSortDirection'
import { getAllChildrenAsThoughts } from './getChildren'

// use a global instance for the unsorted preference so the object reference doesn't change
const NO_SORT: SortPreference = { type: 'None', direction: null }

/**
 * Get sort direction if given sort type is not 'None'.
 */
const getSortDirection = (sortType: string, state: State, id: ThoughtId) => {
  if (sortType === 'None') return null
  const sortTypeId = findDescendant(state, id, ['=sort', sortType])
  const childrenSortDirection = sortTypeId ? getAllChildrenAsThoughts(state, sortTypeId) : []
  return childrenSortDirection.length > 0 ? parseSortDirection(childrenSortDirection[0].value) : 'Asc'
}

/** Get the sort setting from the given context meta. Returns None if the context has no =sort attribute, i.e. it is sorted manually by rank. */
const getSortPreference = (state: State, id: ThoughtId): SortPreference => {
  const sortId = findDescendant(state, id, ['=sort'])
  const childrenSort = sortId ? getAllChildrenAsThoughts(state, sortId) : []
  return childrenSort.length > 0
    ? {
        type: childrenSort[0].value,
        direction: getSortDirection(childrenSort[0].value, state, id),
      }
    : NO_SORT
}

export default getSortPreference
