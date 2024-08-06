import { DragSourceMonitor, useDrag } from 'react-dnd'
import DragAndDropType from '../@types/DragAndDropType'
import DragShortcutZone from '../@types/DragShortcutZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import Shortcut from '../@types/Shortcut'
import { dragShortcutActionCreator as dragShortcut } from '../actions/dragShortcut'
import { ShortcutRowProps } from '../components/ShortcutRow'
import { noop } from '../constants'
import store from '../stores/app'

interface DraggableShortcutRowProps {
  customize?: boolean
  shortcut: Shortcut | null
}

/** Returns true if the toolbar-button can be dragged. */
const canDrag = (props: ShortcutRowProps) => !!props.shortcut && !!props.customize

/** Collects props from the DragSource. */
const dragCollect = (monitor: DragSourceMonitor) => {
  return {
    dragPreview: noop,
    isDragging: monitor.isDragging(),
    zone: monitor.getItem()?.zone,
  }
}

/** Handles drag start. */
const beginDrag = (props: ShortcutRowProps): DragToolbarItem => {
  const shortcut = props.shortcut!
  store.dispatch(dragShortcut(shortcut.id))
  return { shortcut: shortcut, zone: DragShortcutZone.Remove, type: DragAndDropType.ToolbarButton }
}

/** Handles drag end. */
const endDrag = () => {
  store.dispatch(dragShortcut(null))
}

/** A draggable toolbar shortcut hook. */
const useDragAndDropShortcutRow = (props: DraggableShortcutRowProps) => {
  const [{ isDragging }, dragSource, dragPreview] = useDrag({
    item: {
      shortcut: props.shortcut,
      zone: DragShortcutZone.Remove,
      type: DragAndDropType.ToolbarButton,
    },
    begin: () => beginDrag(props),
    canDrag: () => canDrag(props),
    end: () => endDrag(),
    collect: dragCollect,
  })

  return { isDragging, dragSource, dragPreview }
}

export default useDragAndDropShortcutRow
