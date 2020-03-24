import { hashContext } from './hashContext.js'
import { headRank } from './headRank.js'

/** Returns the editable DOM node of the given thoughts */
export const editableNode = thoughtsRanked => {
  const rank = headRank(thoughtsRanked)
  // also selects dividers
  const editableThoughtElement = document.getElementsByClassName('child editing')[0]
  if (editableThoughtElement) {
    return editableThoughtElement.getElementsByClassName('editable-' + hashContext(thoughtsRanked, rank))[0]
  }
  else {
    return document.getElementsByClassName('editable-' + hashContext(thoughtsRanked, rank))[0]
  }
}
