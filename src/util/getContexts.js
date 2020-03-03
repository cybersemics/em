import { store } from '../store.js'

// util
import { getThought } from './getThought.js'
import { isDivider } from './isDivider.js'

/** Returns a list of contexts that the given thought is a member of. */
export const getContexts = (value, thoughtIndex = store.getState().present.thoughtIndex) => {
  if (isDivider(value)) return []
  return (getThought(value, thoughtIndex) || {}).contexts || []
}
