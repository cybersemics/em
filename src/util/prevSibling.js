import { store } from '../store.js'

// utils
import {
  isFunction,
  getThoughtsRanked,
  getThoughtsSorted,
  getSortPreference,
  meta,
} from '../util.js'

/** Gets a context's previous sibling with its rank.
  @param context   context or path
*/
export const prevSibling = (value, context, rank) => {
  const { showHiddenThoughts } = store.getState()
  const contextMeta = meta(context)
  const sortPreference = getSortPreference(contextMeta)
  const siblings = sortPreference === 'Alphabetical' ? getThoughtsSorted(context) : getThoughtsRanked(context)
  let prev// eslint-disable-line fp/no-let
  siblings.find(child => {
    if (child.value === value && child.rank === rank) {
      return true
    }
    else if (!showHiddenThoughts && (isFunction(child.value) || meta(context.concat(child.value)).hidden)) {
      return false
    }
    else {
      prev = child
      return false
    }
  })
  return prev
}
