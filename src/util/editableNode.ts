import Path from '../@types/Path'
import head from './head'
import isMobile from './isMobile'

/** Returns the editable DOM node of the given thoughts. */
const editableNode = (path: Path): HTMLElement | null => {
  if (isMobile()) return null
  // also selects dividers
  return (document.getElementsByClassName('editable-' + head(path))[0] as HTMLElement) || null
}

export default editableNode
