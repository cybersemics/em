// util
import { isDivider } from '../util'

// selectors
import { getThought } from '../selectors'

/** Returns a list of contexts that the given thought is a member of. */
export default (state, value) => {
  if (isDivider(value)) return []
  return (getThought(state, value) || {}).contexts || []
}
