import { getSetting, getAllChildren } from '../selectors'
import { State } from '../util/initialState'
import { Context, SortPreference } from '../types'
import { unroot } from '../util'

/**
 * Todo:: I don't like this.
 */
const getSortDirectionFromString = (sortDirection: string | null) => {
  switch (sortDirection) {
  case 'Asc': return 'Asc'
  case 'Desc': return 'Desc'
  default: return null
  }
}

/**
 * Get sort direction if given sort type is not 'None'.
 */
const getSortDirection = (sortType: string, state: State, context: Context) => {
  if (sortType === 'None') return null
  const childrenSortDirection = getAllChildren(state, [...unroot(context), '=sort', sortType])
  return childrenSortDirection.length > 0
    ? getSortDirectionFromString(childrenSortDirection[0].value)
    : 'Asc'

}

/** Get the sort setting from the given context meta or, if not provided, the global sort. */
const getSortPreference = (state: State, context: Context) : SortPreference => {
  const childrenSort = getAllChildren(state, [...unroot(context), '=sort'])
  return childrenSort.length > 0
    ? {
      type: childrenSort[0].value,
      direction: getSortDirection(childrenSort[0].value, state, context)
    }
    : getGlobalSortPreference(state)
}

/**
 * Get global sort preference.
 */
export const getGlobalSortPreference = (state: State) : SortPreference => {
  const globalSortType = getSetting(state, ['Global Sort']) || 'None'
  const globalSortDirection = globalSortType !== 'None' ?
    getSetting(state, ['Global Sort', globalSortType]) || 'Asc'
    : null

  return {
    type: globalSortType,
    direction: getSortDirectionFromString(globalSortDirection)
  }
}

export default getSortPreference
