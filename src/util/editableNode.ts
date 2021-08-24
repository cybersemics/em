import { hashContext, headRank, pathToContext } from '../util'
import { Path } from '../@types'
import { isMobile } from './isMobile'

/** Returns the editable DOM node of the given thoughts. */
export const editableNode = (path: Path): HTMLElement | null => {
  if (isMobile()) return null

  const rank = headRank(path)
  // also selects dividers
  return (
    (document.getElementsByClassName('editable-' + hashContext(pathToContext(path), rank))[0] as HTMLElement) || null
  )
}
