import { getSetting, getThoughts } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Get the sort setting from the given context meta or, if not provided, the global sort. */
const getSortPreference = (state: State, context: Context) => {
  const childrenSort = getThoughts(state, [...context, '=sort'])
  return childrenSort.length > 0
    ? childrenSort[0].value
    : getSetting(state, ['Global Sort']) || 'None'
}

export default getSortPreference
