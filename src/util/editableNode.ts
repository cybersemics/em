//@ts-nocheck

import { hashContext } from './hashContext'
import { headRank } from './headRank'

/** Returns the editable DOM node of the given thoughts. */
export const editableNode = thoughtsRanked => {
  const rank = headRank(thoughtsRanked)
  // also selects dividers
  return document.getElementsByClassName('editable-' + hashContext(thoughtsRanked, rank))[0]
}
