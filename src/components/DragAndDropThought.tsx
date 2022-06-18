import { FC } from 'react'
import {
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd'
import { isTouch } from '../browser'
import { store } from '../store'
import { NOOP } from '../constants'
import globals from '../globals'
import alert from '../action-creators/alert'
import dragHold from '../action-creators/dragHold'
import dragInProgress from '../action-creators/dragInProgress'
import error from '../action-creators/error'
import moveThought from '../action-creators/moveThought'
import createThought from '../action-creators/createThought'
import { ConnectedThoughtContainerProps, ConnectedThoughtDispatchProps, ThoughtContainerProps } from './Thought'
import * as selection from '../device/selection'

// util
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import equalArrays from '../util/equalArrays'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import isDocumentEditable from '../util/isDocumentEditable'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import unroot from '../util/unroot'

// selectors
import getNextRank from '../selectors/getNextRank'
import getRankBefore from '../selectors/getRankBefore'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtById from '../selectors/getThoughtById'
import pathToThought from '../selectors/pathToThought'
import findDescendant from '../selectors/findDescendant'
import isBefore from '../selectors/isBefore'
import rootedParentOf from '../selectors/rootedParentOf'
import visibleDistanceAboveCursor from '../selectors/visibleDistanceAboveCursor'

export type ConnectedDraggableThoughtContainerProps = ConnectedThoughtContainerProps &
  ReturnType<typeof dragCollect> &
  ReturnType<typeof dropCollect> &
  ConnectedThoughtDispatchProps

/** Returns true if the thought can be dragged. */
const canDrag = (props: ConnectedThoughtContainerProps) => {
  const state = store.getState()
  const thoughtId = head(props.simplePath)
  const pathParentId = head(parentOf(props.simplePath))
  const isDraggable = props.isVisible || props.isCursorParent

  return (
    isDocumentEditable() &&
    !!isDraggable &&
    (!isTouch || globals.touched) &&
    !findDescendant(state, thoughtId, '=immovable') &&
    !findDescendant(state, thoughtId, '=readonly') &&
    !findDescendant(state, pathParentId, '=immovable') &&
    !findDescendant(state, pathParentId, '=readonly')
  )
}

/** Handles drag start. */
const beginDrag = ({ simplePath }: ConnectedThoughtContainerProps) => {
  const offset = selection.offset()
  store.dispatch(
    dragInProgress({
      value: true,
      draggingThought: simplePath,
      ...(offset != null ? { offset } : null),
    }),
  )
  return { simplePath: simplePath }
}

/** Handles drag end. */
const endDrag = () => {
  store.dispatch([dragInProgress({ value: false }), dragHold({ value: false })])
}

/** Collects props from the DragSource. */
const dragCollect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
  dragSource: connect.dragSource(),
  dragPreview: NOOP,
  isDragging: monitor.isDragging(),
})

/** Returns true if the ThoughtContainer can be dropped at the given DropTarget. */
const canDrop = (props: ThoughtContainerProps, monitor: DropTargetMonitor) => {
  const state = store.getState()
  const { cursor, expandHoverTopPath } = state
  const { path } = props
  const { simplePath: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.simplePath!
  const isSorted = getSortPreference(state, head(props.simplePath!)).type !== 'None'

  const distance = cursor ? cursor?.length - thoughtsTo.length : 0

  /** If the epxand hover top is active then all the descenendants of the current active expand hover top path should be droppable. */
  const isExpandedTop = () =>
    expandHoverTopPath && path.length > expandHoverTopPath.length && isDescendantPath(path, expandHoverTopPath)

  const isHidden = distance >= visibleDistanceAboveCursor(state) && !isExpandedTop()

  const isSelf = equalPath(thoughtsTo, thoughtsFrom)
  const isDescendantOfFrom = isDescendantPath(thoughtsTo, thoughtsFrom) && !isSelf
  const oldContext = rootedParentOf(state, thoughtsFrom)
  const newContext = rootedParentOf(state, thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // do not drop on descendants (exclusive) or thoughts hidden by autofocus
  // allow drop on itself or after itself even  though it is a noop so that drop-hover appears consistently
  // allow drop if thought is the nearest visible though to the root
  // allow drop if the thought is the active expanded top context or it's direct children
  return !isHidden && !isDescendantOfFrom && (!isSorted || !sameContext)
}

/** Handles dropping a thought on a DropTarget. */
const drop = (props: ThoughtContainerProps, monitor: DropTargetMonitor) => {
  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const state = store.getState()

  const { simplePath: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.simplePath!
  const toThought = pathToThought(state, thoughtsTo)
  const fromThought = pathToThought(state, thoughtsFrom)
  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedParentOf(state, thoughtsFrom)
  const newContext = rootedParentOf(state, thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // cannot move root or em context
  if (isRootOrEM && !sameContext) {
    store.dispatch(
      error({ value: `Cannot move the ${isRoot(thoughtsFrom) ? 'home' : 'em'} context to another context.` }),
    )
    return
  }

  // drop on itself or after itself is a noop
  if (equalPath(thoughtsFrom, thoughtsTo) || isBefore(state, thoughtsFrom, thoughtsTo)) return

  const parent = unroot(rootedParentOf(state, thoughtsTo))
  const newPath = appendToPath(parent, head(thoughtsFrom))

  const newRank = getRankBefore(state, thoughtsTo)
  store.dispatch(
    props.showContexts
      ? createThought({
          value: toThought.value,
          context: pathToContext(state, thoughtsFrom),
          rank: getNextRank(state, thoughtsFrom),
        })
      : moveThought({
          oldPath: thoughtsFrom,
          newPath,
          newRank,
        }),
  )

  const parentThought = getThoughtById(state, head(parentOf(thoughtsTo)))

  // alert user of move to another context
  if (!sameContext) {
    // wait until after MultiGesture has cleared the error so this alert does not get cleared
    setTimeout(() => {
      const alertFrom = '"' + ellipsize(fromThought.value) + '"'
      const alertTo = isRoot(newContext) ? 'home' : '"' + ellipsize(parentThought.value) + '"'

      store.dispatch(alert(`${alertFrom} moved to ${alertTo} context.`, { alertType: 'moveThought', clearDelay: 5000 }))
    }, 100)
  }
}

/** Collects props from the DropTarget. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  // is being hovered over current thought irrespective of whether the given item is droppable
  isBeingHoveredOver: monitor.isOver({ shallow: true }),
  isDeepHovering: monitor.isOver(),
})

/** A draggable and droppable Thought component. */
const DragAndDropThought = (thoughtContainer: FC<ConnectedDraggableThoughtContainerProps>) =>
  DragSource(
    'thought',
    { canDrag, beginDrag, endDrag },
    dragCollect,
  )(DropTarget('thought', { canDrop, drop }, dropCollect)(thoughtContainer))

export default DragAndDropThought
