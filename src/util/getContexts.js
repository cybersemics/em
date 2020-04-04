import { store } from '../store'

// util
import { getThought } from './getThought'
import { isDivider } from './isDivider'

/** Returns a list of contexts that the given thought is a member of. */
export const getContexts = (value, thoughtIndex = store.getState().thoughtIndex) => {
  if (isDivider(value)) return []
  return (getThought(value, thoughtIndex) || {}).contexts || []
}
