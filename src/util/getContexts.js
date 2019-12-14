import { store } from '../store.js'

// util
import { hashContext } from './hashContext.js'
import { exists } from './exists.js'
import { getThought } from './getThought.js'

/** Returns a list of unique contexts that the given item is a member of. */
export const getContexts = (key, thoughtIndex = store.getState().thoughtIndex) => {
  const cache = {}

  // this can occur during normal operations and should probably be rearchitected
  // e.g. while deleting an item, the following function stack is invoked after the thoughtIndex has been updated but before the url has: updateUrlHistory > decodeItemsUrl > rankItemsFirstMatch > getContexts
  if (!exists(key, thoughtIndex)) {
    // console.error(`getContexts: Unknown key "${key}" context: ${items.join(',')}`)
    return []
  }
  return (getThought(key, thoughtIndex).memberOf || [])
    .filter(member => {
      if (!member.context) return false
      const exists = cache[hashContext(member.context)]
      cache[hashContext(member.context)] = true
      // filter out items that exist
      return !exists
    })
}
