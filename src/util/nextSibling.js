// util
import {
  equalThoughtRanked,
  equalThoughtSorted,
  getThoughtsRanked,
  getThoughtsSorted,
  getSortPreference,
  meta,
  pathToContext,
} from '../util.js'

/** Gets thoughts's next sibling with its rank. */
export const nextSibling = (value, context, rank) => {
  const sortPreference = getSortPreference(meta(pathToContext(context)))
  const siblings = sortPreference === 'Alphabetical' ? getThoughtsSorted(context) : getThoughtsRanked(context)
  const i = siblings.findIndex(child => sortPreference === 'Alphabetical' ? equalThoughtSorted(child, { value }) :
    equalThoughtRanked(child, { value, rank }))
  return siblings[i + 1]
}
