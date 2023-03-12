import { FC } from 'react'
import {
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd'
import DragToolbarItem from '../@types/DragToolbarItem'
import alert from '../action-creators/alert'
import importText from '../action-creators/importText'
import moveThought from '../action-creators/moveThought'
import { AlertText, AlertType, EM_TOKEN, NOOP, TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
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
const canDrag = (props: ToolbarButtonProps) => {
  const state = store.getState()
  return state.showModal === 'customizeToolbar'
}

/** Handles drag start. */
const beginDrag = ({ shortcutId }: ToolbarButtonProps): DragToolbarItem => {
  // const offset = selection.offset()
  store.dispatch(
    alert(AlertText.DragAndDropToolbar, { alertType: AlertType.DragAndDropToolbarHint, showCloseLink: false }),
  )
  //   dragInProgress({
  //     value: true,
  //     draggingThought: simplePath,
  //     sourceZone: DragThoughtZone.Thoughts,
  //     ...(offset != null ? { offset } : null),
  //   }),
  // )
  // return { path, simplePath, zone: DragThoughtZone.Thoughts }
  const shortcut = shortcutById(shortcutId)
  if (!shortcut) {
    throw new Error('Missing shortcut: ' + shortcutId)
  }
  return { shortcut }
}

/** Handles drag end. */
const endDrag = () => {
  store.dispatch(alert(null, { alertType: AlertType.DragAndDropToolbarHint }))
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

/** Returns true if the ThoughtContainer can be dropped at the given DropTarget. */
const canDrop = (props: ToolbarButtonProps, monitor: DropTargetMonitor) => {
  const { shortcut }: DragToolbarItem = monitor.getItem()

  // TODO
  return !!shortcut
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
  const userShortcutsThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
  if (!userShortcutsThoughtId) {
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
  const userShortcutChildren = getChildrenRanked(store.getState(), userShortcutsThoughtId)
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
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  // is being hovered over current toolbar-button irrespective of whether the given item is droppable
  isBeingHoveredOver: monitor.isOver({ shallow: true }),
  isDeepHovering: monitor.isOver(),
})

/** A draggable and droppable toolbar button. */
const DragAndDropToolbarButton = (toolbarButton: FC<DraggableToolbarButtonProps>) =>
  DragSource(
    'toolbar-button',
    { canDrag, beginDrag, endDrag },
    dragCollect,
  )(DropTarget('toolbar-button', { canDrop, drop }, dropCollect)(toolbarButton))

export default DragAndDropToolbarButton
