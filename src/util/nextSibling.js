import { store } from '../store'

// util
import {
  equalThoughtRanked,
  equalThoughtSorted,
  getThoughtsRanked,
  getThoughtsSorted,
  getSortPreference,
  isFunction,
  meta,
  pathToContext,
} from '../util.js'

/** Gets thoughts's next sibling with its rank. */
export const nextSibling = (value, context, rank) => {
  const { showHiddenThoughts } = store.getState()
  const sortPreference = getSortPreference(meta(pathToContext(context)))
  const siblings = sortPreference === 'Alphabetical' ? getThoughtsSorted(context) : getThoughtsRanked(context)
  const notHidden = child => !isFunction(child.value) && !meta(context.concat(child.value)).hidden
  const siblingsFiltered = showHiddenThoughts ? siblings : siblings.filter(notHidden)
  const i = siblingsFiltered.findIndex(child => sortPreference === 'Alphabetical' ? equalThoughtSorted(child, { value }) :
    equalThoughtRanked(child, { value, rank }))
  return siblingsFiltered[i + 1]
}
