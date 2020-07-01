import { hashContext } from './hashContext'
import { headRank } from './headRank'
import { Path } from '../types'

/** Returns the editable DOM node of the given thoughts. */
export const editableNode = (thoughtsRanked: Path): Element => {
  const rank = headRank(thoughtsRanked)
  // also selects dividers
  return document.getElementsByClassName('editable-' + hashContext(thoughtsRanked, rank))[0]
}
