import { getSortPreference } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Get whether the given context sorted alphabetically. */
const isContextSorted = (state: State, context: Context) => {
  const sortPreference = getSortPreference(state, context)
  return sortPreference.type !== 'None'
}

export default isContextSorted
