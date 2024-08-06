import DragAndDropType from './DragAndDropType'
import DragShortcutZone from './DragShortcutZone'
import Shortcut from './Shortcut'

/** Represents the currently dragged toolbar button from react-dnd. Returned by monitor.getItem() in the drop handler. */
interface DragToolbarItem {
  shortcut: Shortcut
  zone: DragShortcutZone
  type: DragAndDropType
}

export default DragToolbarItem
