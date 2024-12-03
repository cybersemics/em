import Command from './Command'
import DragShortcutZone from './DragShortcutZone'

/** Represents the currently dragged toolbar button from react-dnd. Returned by monitor.getItem() in the drop handler. */
interface DragToolbarItem {
  shortcut: Command
  zone: DragShortcutZone
}

export default DragToolbarItem
