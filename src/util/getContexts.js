import { store } from '../store.js'

// util
import { encodeItems } from './encodeItems.js'
import { exists } from './exists.js'
import { getThought } from './getThought.js'

/** Returns a list of unique contexts that the given item is a member of. */
export const getContexts = (key, data = store.getState().data) => {
  const cache = {}

  // this can occur during normal operations and should probably be rearchitected
  // e.g. while deleting an item, the following function stack is invoked after the data has been updated but before the url has: updateUrlHistory > decodeItemsUrl > rankItemsFirstMatch > getContexts
  if (!exists(key, data)) {
    // console.error(`getContexts: Unknown key "${key}" context: ${items.join(',')}`)
    return []
  }
  return (getThought(key, data).memberOf || [])
    .filter(member => {
      if (!member.context) return false
      const exists = cache[encodeItems(member.context)]
      cache[encodeItems(member.context)] = true
      // filter out items that exist
      return !exists
    })
}
