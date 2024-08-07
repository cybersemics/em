import { DragSourceMonitor, DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import DragAndDropType from '../@types/DragAndDropType'
import DragShortcutZone from '../@types/DragShortcutZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import { dragShortcutActionCreator as dragShortcut } from '../actions/dragShortcut'
import { initUserToolbarActionCreator as initUserToolbar } from '../actions/initUserToolbar'
import { moveThoughtActionCreator as moveThought } from '../actions/moveThought'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { ToolbarButtonProps } from '../components/ToolbarButton'
import { EM_TOKEN } from '../constants'
import contextToPath from '../selectors/contextToPath'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import { shortcutById } from '../shortcuts'
import store from '../stores/app'
import appendToPath from '../util/appendToPath'

export type DraggableToolbarButtonProps = ToolbarButtonProps & {
  path: Path
  simplePath: SimplePath
}

/** Returns true if the toolbar-button can be dragged. */
const canDrag = (props: ToolbarButtonProps) => !!props.customize

/** Handles drag start. */
const beginDrag = ({ shortcutId }: ToolbarButtonProps): DragToolbarItem => {
  // const offset = selection.offset()
  store.dispatch(dragShortcut(shortcutId))
  const shortcut = shortcutById(shortcutId)
  return { shortcut, zone: DragShortcutZone.Toolbar, type: DragAndDropType.ToolbarButton }
}

/** Handles drag end. */
const endDrag = () => {
  store.dispatch(dragShortcut(null))
  // setTimeout(() => {
  //   store.dispatch([
  //     dragInProgress({ value: false }),
  //     dragHold({ value: false }),
  //     (dispatch, getState) => {
  //       if (getState().alert?.alertType === AlertType.DragAndDropHint) {
  //         dispatch(alert(null))
  //       }
  //     },
  //   ])
  // })
}

/** Handles dropping a toolbar button on a DropTarget. */
const drop = (props: ToolbarButtonProps, monitor: DropTargetMonitor) => {
  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { shortcut } = monitor.getItem()
  const from = shortcut
  const to = shortcutById(props.shortcutId)!

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

/** Collects props from the DragSource. */
const dragCollect = (monitor: DragSourceMonitor) => ({
  isDragging: monitor.isDragging(),
})

/** Collects props from the DropTarget. */
const dropCollect = (monitor: DropTargetMonitor) => ({
  dropZone: DragShortcutZone.Toolbar,
  isHovering: monitor.isOver({ shallow: true }),
})

/** A draggable and droppable toolbar button. */
const useDragAndDropToolBarButton = (props: Partial<DraggableToolbarButtonProps>) => {
  const propsTypes = props as DraggableToolbarButtonProps

  const [{ isDragging }, dragSource, dragPreview] = useDrag({
    item: {
      shortcut: shortcutById(propsTypes.shortcutId),
      zone: DragShortcutZone.Toolbar,
      type: DragAndDropType.ToolbarButton,
    },
    begin: () => beginDrag(propsTypes),
    canDrag: () => canDrag(propsTypes),
    end: () => endDrag(),
    collect: dragCollect,
  })

  const [{ isHovering }, dropTarget] = useDrop({
    accept: [DragAndDropType.ToolbarButton, NativeTypes.FILE],
    drop: (item, monitor) => drop(propsTypes, monitor),
    collect: dropCollect,
  })

  return { isDragging, dragSource, dragPreview, isHovering, dropTarget }
}

export default useDragAndDropToolBarButton
