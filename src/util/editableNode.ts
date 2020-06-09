/**
 * @packageDocumentation
 * @module util.editableNode
 */

import { hashContext } from './hashContext'
import { headRank } from './headRank'
import { Path } from '../types'

/** Returns the editable DOM node of the given thoughts. */
export const editableNode = (thoughtsRanked: Path): HTMLElement | null => {
  const rank = headRank(thoughtsRanked)
  // also selects dividers
  return document.getElementsByClassName('editable-' + hashContext(thoughtsRanked, rank))[0] as HTMLElement || null
}
