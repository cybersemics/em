import { hashContext, headRank, pathToContext } from '../util'
import { Path } from '../types'

/** Returns the editable DOM node of the given thoughts. */
export const editableNode = (path: Path): HTMLElement | null => {
  const rank = headRank(path)
  // also selects dividers
  return document.getElementsByClassName('editable-' + hashContext(pathToContext(path), rank))[0] as HTMLElement || null
}
