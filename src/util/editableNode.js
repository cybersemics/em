import { hashContext } from './hashContext.js'
import { headRank } from './headRank.js'

/** Returns the editable DOM node of the given thoughts */
export const editableNode = thoughtsRanked => {
  const rank = headRank(thoughtsRanked)
  return document.getElementsByClassName('editable-' + hashContext(thoughtsRanked, rank))[0]
}
