import { SortPreference, State } from '../@types'
import { getSetting } from '../selectors'
import { parseSortDirection } from '../util'

/**
 * Get global sort preference.
 */
const getGlobalSortPreference = (state: State): SortPreference => {
  const globalSortType = getSetting(state, ['Global Sort']) || 'None'
  const globalSortDirection =
    globalSortType !== 'None' ? getSetting(state, ['Global Sort', globalSortType]) || 'Asc' : null

  return {
    type: globalSortType,
    direction: globalSortDirection !== null ? parseSortDirection(globalSortDirection) : null,
  }
}

export default getGlobalSortPreference
