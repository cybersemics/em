import { getSortPreference, getThoughtsRanked, getThoughtsSorted, hasChild } from '../selectors'
import { isFunction } from '../util'
import { State } from '../util/initialState'
import { Child, Context } from '../types'

/**
 * Gets a context's previous sibling with its rank.
 *
 * @param context   Can be a context or path.
 */
const prevSibling = (state: State, value: string, context: Context, rank: number) => {
  const { showHiddenThoughts } = state
  const sortPreference = getSortPreference(state, context)
  const siblings = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)
  let prev// eslint-disable-line fp/no-let

  /** Returns true when thought is not hidden due to being a function or having a =hidden attribute. */
  const isVisible = (child: Child) => showHiddenThoughts || (
    !isFunction(child.value) &&
    !hasChild(state, [...context, child.value], '=hidden')
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

export default prevSibling
