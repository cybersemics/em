import Command from './Command'
import DragCommandZone from './DragCommandZone'

/** Represents the currently dragged toolbar button from react-dnd. Returned by monitor.getItem() in the drop handler. */
interface DragToolbarItem {
  command: Command
  zone: DragCommandZone
}

export default DragToolbarItem
