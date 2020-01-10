import { store } from '../store.js'

// util
import { exists } from './exists.js'
import { getThought } from './getThought.js'
import { hashContext } from './hashContext.js'
import { isDivider } from './isDivider.js'

/** Returns a list of unique contexts that the given thought is a member of. */
export const getContexts = (value, thoughtIndex = store.getState().thoughtIndex) => {
  const cache = {}

  // this can occur during normal operations and should probably be rearchitected
  // e.g. while deleting an thought, the following function stack is invoked after the thoughtIndex has been updated but before the url has: updateUrlHistory > decodeThoughtsUrl > rankThoughtsFirstMatch > getContexts
  if (!exists(value, thoughtIndex)) {
    // console.error(`getContexts: Unknown value "${value}" context: ${thoughts.join(',')}`)
    return []
  }
  else if (isDivider(value)) {
    return []
  }

  return (getThought(value, thoughtIndex).contexts || [])
    .filter(member => {
      if (!member.context) return false
      const exists = cache[hashContext(member.context)]
      cache[hashContext(member.context)] = true
      // filter out thoughts that exist
      return !exists
    })
}
