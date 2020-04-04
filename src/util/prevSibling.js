import { store } from '../store'

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

  // returns true when thought is not hidden due to being a function or having a =hidden attribute
  const isVisible = thoughtRanked => showHiddenThoughts || (
    !isFunction(thoughtRanked.value) &&
    !meta(context.concat(thoughtRanked.value)).hidden
  )

  siblings.find(child => {
    if (child.value === value && child.rank === rank) {
      return true
    }
    else if (!isVisible(child)) {
      return false
    }
    else {
      prev = child
      return false
    }
  })
  return prev
}
