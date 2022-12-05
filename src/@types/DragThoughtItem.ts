import DragThoughtZone from './DragThoughtZone'
import Path from './Path'
import SimplePath from './SimplePath'

/** Represents the currently dragged thought from react-dnd. Returned by monitor.getItem() in the drop handler. */
interface DragThoughtItem {
  // path may be included for performance to avoid extraneous calls to simplifyPath.
  // If not passed, simplePath is used.
  path?: Path
  simplePath: SimplePath
  zone: DragThoughtZone
}

export default DragThoughtItem
