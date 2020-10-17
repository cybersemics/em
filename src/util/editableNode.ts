import { hashContext } from './hashContext'
import { headRank } from './headRank'
import { Path } from '../types'

/** Returns the editable DOM node of the given thoughts. */
export const editableNode = (path: Path): HTMLElement | null => {
  const rank = headRank(path)
  // also selects dividers
  return document.getElementsByClassName('editable-' + hashContext(path, rank))[0] as HTMLElement || null
}
