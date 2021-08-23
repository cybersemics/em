import { Context, SortPreference, State } from '../@types'
import { parseSortDirection, unroot } from '../util'
import getGlobalSortPreference from './getGlobalSortPreference'
import { getAllChildrenAsThoughts } from './getChildren'

/**
 * Get sort direction if given sort type is not 'None'.
 */
const getSortDirection = (sortType: string, state: State, context: Context) => {
  if (sortType === 'None') return null
  const childrenSortDirection = getAllChildrenAsThoughts(state, [...unroot(context), '=sort', sortType])
  return childrenSortDirection.length > 0 ? parseSortDirection(childrenSortDirection[0].value) : 'Asc'
}

/** Get the sort setting from the given context meta or, if not provided, the global sort. */
const getSortPreference = (state: State, context: Context): SortPreference => {
  const childrenSort = getAllChildrenAsThoughts(state, [...unroot(context), '=sort'])
  return childrenSort.length > 0
    ? {
        type: childrenSort[0].value,
        direction: getSortDirection(childrenSort[0].value, state, context),
      }
    : getGlobalSortPreference(state)
}

export default getSortPreference
