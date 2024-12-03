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
import appendToPath from '../util/appendToPath'

/** Handles dropping a toolbar button on a DropTarget. */
const drop = (shortcutId: CommandId, monitor: DropTargetMonitor) => {
  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { shortcut } = monitor.getItem() as { shortcut: Command; zone: DragCommandZone }
  const from = shortcut
  const to = commandById(shortcutId)!

  // initialize EM/Settings/Toolbar/Visible with default shortcuts
  store.dispatch([
    initUserToolbar(),
    (dispatch, getState) => {
      const state = getState()
      const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
      const userShortcutChildren = getChildrenRanked(state, userToolbarThoughtId)
      const userShortcutIds = userShortcutChildren.map(subthought => subthought.value)

      // user shortcuts must exist since it was created above
      const userShortcutsPath = contextToPath(state, [EM_TOKEN, 'Settings', 'Toolbar'])!
      const fromIndex = userShortcutIds.indexOf(from.id)
      const toIndex = userShortcutIds.indexOf(to.id)
      if (toIndex === -1) {
        console.error('Missing toIndex for', to.id)
        return
      }

      const toThoughtId = userShortcutChildren[toIndex].id
      const toPath = appendToPath(userShortcutsPath, toThoughtId)

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
        const fromThoughtId = userShortcutChildren[fromIndex].id
        const fromPath = appendToPath(userShortcutsPath, fromThoughtId)
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
const useDragAndDropToolbarButton = ({ shortcutId, customize }: { shortcutId: CommandId; customize?: boolean }) => {
  const [{ isDragging }, dragSource, dragPreview] = useDrag({
    type: DragAndDropType.ToolbarButton,
    item: () => {
      store.dispatch(dragCommand(shortcutId))
      const shortcut = commandById(shortcutId)
      return { shortcut, zone: DragCommandZone.Toolbar }
    },
    canDrag: () => !!customize,
    end: () => store.dispatch(dragCommand(null)),
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [{ isHovering }, dropTarget] = useDrop({
    accept: [DragAndDropType.ToolbarButton, NativeTypes.FILE],
    drop: (item, monitor) => drop(shortcutId, monitor),
    collect: monitor => ({
      dropZone: DragCommandZone.Toolbar,
      isHovering: monitor.isOver({ shallow: true }),
    }),
  })

  return { isDragging, dragSource, dragPreview, isHovering, dropTarget }
}

export default useDragAndDropToolbarButton
