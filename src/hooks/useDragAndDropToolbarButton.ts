import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import DragAndDropType from '../@types/DragAndDropType'
import DragCommandZone from '../@types/DragCommandZone'
import { dragCommandActionCreator as dragCommand } from '../actions/dragCommand'
import { initUserToolbarActionCreator as initUserToolbar } from '../actions/initUserToolbar'
import { moveThoughtActionCreator as moveThought } from '../actions/moveThought'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { commandById } from '../commands'
import { EM_TOKEN } from '../constants'
import contextToPath from '../selectors/contextToPath'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import store from '../stores/app'
import longPressStore from '../stores/longPressStore'
import appendToPath from '../util/appendToPath'
import haptics from '../util/haptics'

/** Handles dropping a toolbar button on a DropTarget. */
const drop = (commandId: CommandId, monitor: DropTargetMonitor) => {
  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { command } = monitor.getItem() as { command: Command; zone: DragCommandZone }
  const from = command
  const to = commandById(commandId)!

  haptics.medium()

  // initialize EM/Settings/Toolbar/Visible with default commands
  store.dispatch([
    initUserToolbar(),
    (dispatch, getState) => {
      const state = getState()
      const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
      const userCommandChildren = getChildrenRanked(state, userToolbarThoughtId)
      const userCommandIds = userCommandChildren.map(subthought => subthought.value)

      // user commands must exist since it was created above
      const userCommandsPath = contextToPath(state, [EM_TOKEN, 'Settings', 'Toolbar'])!
      const fromIndex = userCommandIds.indexOf(from.id)
      const toIndex = userCommandIds.indexOf(to.id)
      if (toIndex === -1) {
        console.error('Missing toIndex for', to.id)
        return
      }

      const toThoughtId = userCommandChildren[toIndex].id
      const toPath = appendToPath(userCommandsPath, toThoughtId)

      if (fromIndex === -1) {
        store.dispatch(
          newThought({
            value: from.id,
            at: toPath,
            insertBefore: true,
            preventSetCursor: true,
          }),
        )
      } else {
        const fromThoughtId = userCommandChildren[fromIndex].id
        const fromPath = appendToPath(userCommandsPath, fromThoughtId)
        store.dispatch(
          moveThought({
            oldPath: fromPath,
            newPath: fromPath,
            newRank: getRankBefore(state, toPath),
          }),
        )
      }
    },
  ])
}

/** A draggable and droppable toolbar button. */
const useDragAndDropToolbarButton = ({ commandId, customize }: { commandId: CommandId; customize?: boolean }) => {
  const [{ isDragging }, dragSource, dragPreview] = useDrag({
    type: DragAndDropType.ToolbarButton,
    item: () => {
      // Notify the long press store that a drag has started
      // This will reset the lock and trigger onLongPressEnd for any active long presses
      longPressStore.actions.notifyDragStarted()

      store.dispatch(dragCommand(commandId))
      const command = commandById(commandId)
      return { command, zone: DragCommandZone.Toolbar }
    },
    canDrag: () => !!customize,
    end: () => {
      // Reset the lock to allow immediate long press after drag ends
      longPressStore.actions.reset()
      store.dispatch(dragCommand(null))
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [{ isHovering }, dropTarget] = useDrop({
    accept: [DragAndDropType.ToolbarButton, NativeTypes.FILE],
    drop: (item, monitor) => drop(commandId, monitor),
    collect: monitor => ({
      dropZone: DragCommandZone.Toolbar,
      isHovering: monitor.isOver({ shallow: true }),
    }),
  })

  return { isDragging, dragSource, dragPreview, isHovering, dropTarget }
}

export default useDragAndDropToolbarButton
