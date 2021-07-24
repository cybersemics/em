import { Path } from '../@types'
import { headId } from './headId'

/** Returns the editable DOM node of the given thoughts. */
export const editableNode = (path: Path): HTMLElement | null => {
  // const rank = headRank(path)
  // also selects dividers
  return (document.getElementsByClassName('editable-' + headId(path))[0] as HTMLElement) || null
}
