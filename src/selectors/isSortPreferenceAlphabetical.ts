import { getSortPreference } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Get whether the given context sorted alphabetically. */
const isSortPreferenceAlphabetical = (state: State, context: Context) => {
  const sortPreference = getSortPreference(state, context)
  return sortPreference === 'Alphabetical' || sortPreference === 'Alphabetical/desc'
}

export default isSortPreferenceAlphabetical
