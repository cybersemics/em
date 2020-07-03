import { getSortPreference, getThoughtsRanked, getThoughtsSorted, hasChild } from '../selectors'
import { equalThoughtRanked, equalThoughtSorted, isFunction, pathToContext } from '../util'
import { State } from '../util/initialState'
import { Child, Context } from '../types'

/** Gets thoughts's next sibling with its rank. */
const nextSibling = (state: State, value: string, context: Context, rank: number) => {
  const { showHiddenThoughts } = state
  const sortPreference = getSortPreference(state, pathToContext(context))
  const siblings = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)

  /** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
  const notHidden = (child: Child) => !isFunction(child.value) && !hasChild(state, context.concat(child.value), '=hidden')

  const siblingsFiltered = showHiddenThoughts ? siblings : siblings.filter(notHidden)
  const i = siblingsFiltered.findIndex(child => sortPreference === 'Alphabetical' ? equalThoughtSorted(child, { value, rank }) :
    equalThoughtRanked(child, { value, rank }))

  return siblingsFiltered[i + 1]
}

export default nextSibling
