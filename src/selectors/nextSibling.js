// util
import {
  equalThoughtRanked,
  equalThoughtSorted,
  isFunction,
  pathToContext,
} from '../util'

// selectors
import {
  getSortPreference,
  getThoughtsRanked,
  getThoughtsSorted,
  meta,
} from '../selectors'

/** Gets thoughts's next sibling with its rank. */
export default (state, value, context, rank) => {
  const { showHiddenThoughts } = state
  const sortPreference = getSortPreference(state, meta(state, pathToContext(context)))
  const siblings = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)
  const notHidden = child => !isFunction(child.value) && !meta(state, context.concat(child.value)).hidden
  const siblingsFiltered = showHiddenThoughts ? siblings : siblings.filter(notHidden)
  const i = siblingsFiltered.findIndex(child => sortPreference === 'Alphabetical' ? equalThoughtSorted(child, { value }) :
    equalThoughtRanked(child, { value, rank }))
  return siblingsFiltered[i + 1]
}
