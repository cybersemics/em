import DragThoughtZone from './DragThoughtZone'
import Path from './Path'
import SimplePath from './SimplePath'

/** Represents the currently dragged thought from react-dnd. Returned by monitor.getItem() in the drop handler. */
interface DragThoughtItem {
  path: Path
  simplePath: SimplePath
  zone: DragThoughtZone
}

export default DragThoughtItem
