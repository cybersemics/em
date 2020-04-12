import { store } from '../store'

// util
import {
  equalThoughtRanked,
  equalThoughtSorted,
  isFunction,
  pathToContext,
} from '../util'

// selectors
import { getSortPreference, meta } from '../selectors'
import getThoughtsRanked from '../selectors/getThoughtsRanked'
import getThoughtsSorted from '../selectors/getThoughtsSorted'

/** Gets thoughts's next sibling with its rank. */
export const nextSibling = (value, context, rank) => {
  const state = store.getState()
  const { showHiddenThoughts } = state
  const sortPreference = getSortPreference(state, meta(state, pathToContext(context)))
  const siblings = (sortPreference === 'Alphabetical' ? getThoughtsSorted : getThoughtsRanked)(state, context)
  const notHidden = child => !isFunction(child.value) && !meta(state, context.concat(child.value)).hidden
  const siblingsFiltered = showHiddenThoughts ? siblings : siblings.filter(notHidden)
  const i = siblingsFiltered.findIndex(child => sortPreference === 'Alphabetical' ? equalThoughtSorted(child, { value }) :
    equalThoughtRanked(child, { value, rank }))
  return siblingsFiltered[i + 1]
}
