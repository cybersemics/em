import { getSortPreference, getThoughtsRanked, getThoughtsSorted, hasChild } from '../selectors'
import { equalThoughtRanked, equalThoughtSorted, isFunction, pathToContext } from '../util'

/** Gets thoughts's next sibling with its rank. */
export default (state, value, context, rank) => {
  const { showHiddenThoughts } = state
  const sortPreference = getSortPreference(state, pathToContext(context))
  const siblings = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)

  /** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
  const notHidden = child => !isFunction(child.value) && !hasChild(state, context.concat(child.value), '=hidden')

  const siblingsFiltered = showHiddenThoughts ? siblings : siblings.filter(notHidden)
  const i = siblingsFiltered.findIndex(child => sortPreference === 'Alphabetical' ? equalThoughtSorted(child, { value }) :
    equalThoughtRanked(child, { value, rank }))

  return siblingsFiltered[i + 1]
}
