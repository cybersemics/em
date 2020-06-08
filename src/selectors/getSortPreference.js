import { getSetting, getThoughts } from '../selectors'

/** Get the sort setting from the given context meta or, if not provided, the global sort. */
const getSortPreference = (state, context) => {
  const childrenSort = getThoughts(state, [...context, '=sort'])
  return childrenSort.length > 0
    ? childrenSort[0].value
    : getSetting(state, ['Global Sort']) || 'None'
}

export default getSortPreference
