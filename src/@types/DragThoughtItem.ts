import DragThoughtZone from './DragThoughtZone'
import SimplePath from './SimplePath'

/** Represents the currently dragged thought from react-dnd. Returned by monitor.getItem() in the drop handler. */
interface DragThoughtItem {
  simplePath: SimplePath
  zone: DragThoughtZone
}

export default DragThoughtItem
