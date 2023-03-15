import { FC } from 'react'
import {
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd'
import DragShortcutZone from '../@types/DragShortcutZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import dragShortcut from '../action-creators/dragShortcut'
import importText from '../action-creators/importText'
import moveThought from '../action-creators/moveThought'
import { EM_TOKEN, NOOP, TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import contextToPath from '../selectors/contextToPath'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import { shortcutById } from '../shortcuts'
import store from '../stores/app'
import appendToPath from '../util/appendToPath'
import { ToolbarButtonProps } from './ToolbarButton'

export type DraggableToolbarButtonProps = ToolbarButtonProps &
  ReturnType<typeof dragCollect> &
  ReturnType<typeof dropCollect>

/** Returns true if the toolbar-button can be dragged. */
const canDrag = (props: ToolbarButtonProps) => !!props.customize

/** Handles drag start. */
const beginDrag = ({ shortcutId }: ToolbarButtonProps): DragToolbarItem => {
  // const offset = selection.offset()
  store.dispatch(dragShortcut(shortcutId))
  const shortcut = shortcutById(shortcutId)
  return { shortcut }
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

  const state = store.getState()
  const { shortcut } = monitor.getItem()
  const from = shortcut
  const to = shortcutById(props.shortcutId)!

  // initialize EM/Settings/Toolbar/Visible with default shortcuts
  const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
  if (!userToolbarThoughtId) {
    store.dispatch(
      importText({
        path: [EM_TOKEN],
        text: `
          - Settings
            - Toolbar
${TOOLBAR_DEFAULT_SHORTCUTS.map(shortcutId => '              - ' + shortcutId).join('\n')}
        `,
        preventSetCursor: true,
      }),
    )
  }
  const userShortcutChildren = getChildrenRanked(store.getState(), userToolbarThoughtId)
  const userShortcutIds = userShortcutChildren.map(subthought => subthought.value)

  // user shortcuts must exist since it was created above
  const userShortcutsPath = contextToPath(store.getState(), [EM_TOKEN, 'Settings', 'Toolbar'])!
  const fromThoughtId = userShortcutChildren[userShortcutIds.indexOf(from.id)].id
  const toThoughtId = userShortcutChildren[userShortcutIds.indexOf(to.id)].id
  const fromPath = appendToPath(userShortcutsPath, fromThoughtId)
  const toPath = appendToPath(userShortcutsPath, toThoughtId)
  store.dispatch(
    moveThought({
      oldPath: fromPath,
      newPath: fromPath,
      newRank: getRankBefore(store.getState(), toPath),
    }),
  )
}

/** Collects props from the DragSource. */
const dragCollect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
  dragSource: connect.dragSource(),
  dragPreview: NOOP,
  isDragging: monitor.isDragging(),
})

/** Collects props from the DropTarget. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  dropZone: DragShortcutZone.Toolbar,
  isHovering: monitor.isOver({ shallow: true }),
})

/** A draggable and droppable toolbar button. */
const DragAndDropToolbarButton = (toolbarButton: FC<DraggableToolbarButtonProps>) =>
  DragSource(
    'toolbar-button',
    { canDrag, beginDrag, endDrag },
    dragCollect,
  )(DropTarget('toolbar-button', { drop }, dropCollect)(toolbarButton))

export default DragAndDropToolbarButton
