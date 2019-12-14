import { unrank } from './unrank.js'
import { hashContext } from './hashContext.js'
import { headRank } from './headRank.js'

/** Returns the editable DOM node of the given items */
export const editableNode = itemsRanked => {
  const rank = headRank(itemsRanked)
  return document.getElementsByClassName('editable-' + hashContext(unrank(itemsRanked), rank))[0]
}
