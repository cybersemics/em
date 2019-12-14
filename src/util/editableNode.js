import { unrank } from './unrank.js'
import { hashContext } from './hashContext.js'
import { headRank } from './headRank.js'

/** Returns the editable DOM node of the given items */
export const editableNode = thoughtsRanked => {
  const rank = headRank(thoughtsRanked)
  return document.getElementsByClassName('editable-' + hashContext(unrank(thoughtsRanked), rank))[0]
}
