// utils
import {
  isFunction,
} from '../util'

// selectors
import {
  getSortPreference,
  getThoughtsRanked,
  getThoughtsSorted,
  meta,
} from '../selectors'

/** Gets a context's previous sibling with its rank.
  @param context   context or path
*/
export default (state, value, context, rank) => {
  const { showHiddenThoughts } = state
  const contextMeta = meta(state, context)
  const sortPreference = getSortPreference(state, contextMeta)
  const siblings = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)
  let prev// eslint-disable-line fp/no-let

  // returns true when thought is not hidden due to being a function or having a =hidden attribute
  const isVisible = thoughtRanked => showHiddenThoughts || (
    !isFunction(thoughtRanked.value) &&
    !meta(state, context.concat(thoughtRanked.value)).hidden
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
