import { equalThoughtRanked } from './equalThoughtRanked.js'
import { getThoughts } from './getThoughts.js'

/** Gets thoughts's next sibling with its rank. */
export const nextSibling = (value, context, rank) => {
  const siblings = getThoughts(context)
  const i = siblings.findIndex(child => equalThoughtRanked(child, { value, rank }))
  return siblings[i + 1]
}
