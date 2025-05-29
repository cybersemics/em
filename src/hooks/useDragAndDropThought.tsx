import moize from 'moize'
import { DragSourceMonitor, DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { useSelector } from 'react-redux'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtOrFiles from '../@types/DragThoughtOrFiles'
import DragThoughtZone from '../@types/DragThoughtZone'
import Path from '../@types/Path'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { alertActionCreator as alert } from '../actions/alert'
import { createThoughtActionCreator as createThought } from '../actions/createThought'
import { dragHoldActionCreator as dragHold } from '../actions/dragHold'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { errorActionCreator as error } from '../actions/error'
import { importFilesActionCreator as importFiles } from '../actions/importFiles'
import { moveThoughtActionCreator as moveThought } from '../actions/moveThought'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { ThoughtContainerProps } from '../components/Thought'
import { AlertType } from '../constants'
import * as selection from '../device/selection'
import globals from '../globals'
import documentSort from '../selectors/documentSort'
import findDescendant from '../selectors/findDescendant'
import getNextRank from '../selectors/getNextRank'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import isBefore from '../selectors/isBefore'
import isContextViewActive from '../selectors/isContextViewActive'
import isMulticursorPath from '../selectors/isMulticursorPath'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import store from '../stores/app'
import longPressStore from '../stores/longPressStore'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import equalPath from '../util/equalPath'
import haptics from '../util/haptics'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import isDocumentEditable from '../util/isDocumentEditable'
import isDraggedFile from '../util/isDraggedFile'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import unroot from '../util/unroot'

/** Returns true if the thought can be dragged. */
const canDrag = (props: ThoughtContainerProps) => {
  const state = store.getState()
  const thoughtId = head(props.simplePath)
  const pathParentId = head(parentOf(props.simplePath))
  const isDraggable = props.isVisible || props.isCursorParent

  return (
    isDocumentEditable() &&
    !!isDraggable &&
    !findDescendant(state, thoughtId, '=immovable') &&
    !findDescendant(state, thoughtId, '=readonly') &&
    !findDescendant(state, pathParentId, '=immovable') &&
    !findDescendant(state, pathParentId, '=readonly')
  )
}

/** Handles drag start. */
const beginDrag = ({ path, simplePath }: ThoughtContainerProps): DragThoughtItem[] => {
  const offset = selection.offset()
  const state = store.getState()
  const isMulticursorActive = hasMulticursor(state)
  const isCurrentThoughtSelected = isMulticursorPath(state, path)

  const activeMulticursors = isMulticursorActive ? Object.values(state.multicursors) : []

  if (isMulticursorActive && !isCurrentThoughtSelected) {
    store.dispatch(addMulticursor({ path }))
  }

  const draggingThoughts = isMulticursorActive
    ? documentSort(state, [
        ...activeMulticursors,
        ...(isMulticursorActive && !isCurrentThoughtSelected ? [path] : []),
      ]).map(path => ({
        path,
        simplePath: simplifyPath(state, path),
        zone: DragThoughtZone.Thoughts,
      }))
    : [
        {
          path,
          simplePath,
          zone: DragThoughtZone.Thoughts,
        },
      ]

  store.dispatch(
    dragInProgress({
      value: true,
      draggingThought: draggingThoughts.map(item => item.simplePath),
      sourceZone: DragThoughtZone.Thoughts,
      ...(offset != null ? { offset } : null),
    }),
  )

  return draggingThoughts
}

/** Handles drag end. */
const endDrag = () => {
  // Reset the lock variable to allow immediate long press after drag
  longPressStore.unlock()
  globals.longpressing = false

  // Wait till the next tick before ending dragInProgress.
  // This allows onTap to be aborted in Editable to prevent the cursor from moving at the end of a drag.
  // If this delay causes a regression, then we will need to find a different way to prevent the cursor from moving at the end of a drag.
  setTimeout(() => {
    store.dispatch([
      dragInProgress({ value: false }),
      dragHold({ value: false }),
      (dispatch, getState) => {
        if (getState().alert?.alertType === AlertType.DragAndDropHint) {
          dispatch(alert(null))
        }
      },
    ])
  })
}
/** Memoized function that returns true if the thought can be dropped at the destination path. This does not need to account for hidden thoughts since they have pointer-events:none. This function will be called in a continuous loop by react-dnd so it needs to be fast. */
const canDropPath = moize((from: Path, to: Path) => !isDescendantPath(to, from, { exclusive: true }), {
  // only needs to be big enough to cache the calls within a single drag
  // i.e. a reasonable number of destation thoughts that will be hovered over during a single drag
  maxSize: 50,
  profileName: 'canDropPath',
})

/** Returns true if the ThoughtContainer can be dropped at the given DropTarget. */
const canDrop = (props: ThoughtContainerProps, monitor: DropTargetMonitor) => {
  const state = store.getState()

  // dragInProgress can be set to false to abort the drag (e.g. by shaking)
  if (!state.dragInProgress) return false

  const item = monitor.getItem() as DragThoughtOrFiles
  const draggedItems = item as DragThoughtItem[]

  const thoughtsTo = props.path
  const showContexts = thoughtsTo && isContextViewActive(state, parentOf(thoughtsTo))

  // Disallow dropping on context view.
  // This condition must be matched in isChildHovering to correctly highlight the hovering parent.
  return !showContexts && draggedItems.every(thoughtItem => canDropPath(thoughtItem.path, thoughtsTo))
}

/** Handles dropping a thought on a DropTarget. */
const drop = (props: ThoughtContainerProps, monitor: DropTargetMonitor) => {
  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const item = monitor.getItem() as DragThoughtOrFiles
  if (isDraggedFile(item)) {
    store.dispatch(importFiles({ path: props.path, files: item.files, insertBefore: true }))
    return
  }

  const draggedItems = item as DragThoughtItem[]

  if (draggedItems.some(item => !item.path)) {
    console.warn('item.path not defined')
    return
  } else if (!props.path) {
    console.warn('props.path not defined')
    return
  }

  // Set isMulticursorExecuting for multiselect operations to group them as a single undo operation
  const isMultiselectOperation = draggedItems.length > 1
  if (isMultiselectOperation) {
    store.dispatch(
      setIsMulticursorExecuting({
        value: true,
        undoLabel: 'Move Thoughts',
      }),
    )
  }

  for (const thoughtItem of draggedItems) {
    // Recompute destination path in current state (may have changed due to previous moves)
    const state = store.getState()
    const thoughtFrom = thoughtItem.simplePath
    const toThought = pathToThought(state, props.simplePath)
    const fromThought = pathToThought(state, thoughtFrom)
    const isRootOrEM = isRoot(thoughtFrom) || isEM(thoughtFrom)
    const sameParent = equalPath(parentOf(thoughtFrom), parentOf(props.simplePath))

    if (!toThought || !fromThought) {
      console.warn('toThought or fromThought not defined')
      return
    }

    // cannot move root or em context
    if (isRootOrEM && !sameParent) {
      store.dispatch(
        error({
          value: `Cannot move the ${isRoot(thoughtItem.simplePath) ? 'home' : 'em'} context to another context.`,
        }),
      )
      return
    }

    // drop on itself or after itself is a noop
    if (equalPath(thoughtFrom, props.simplePath) || isBefore(state, thoughtItem.simplePath, props.simplePath)) return

    if (!thoughtItem) {
      console.warn('thoughtItem not found for path', thoughtItem)
      continue
    }

    const parent = unroot(rootedParentOf(state, props.simplePath))
    const newPath = appendToPath(parent, head(thoughtItem.path))

    // Execute single moveThought action
    store.dispatch(
      props.showContexts
        ? createThought({
            value: pathToThought(state, props.simplePath)?.value || '',
            path: thoughtItem.simplePath,
            rank: getNextRank(state, head(thoughtItem.path)),
          })
        : moveThought({
            oldPath: thoughtItem.path,
            newPath,
            newRank: getRankBefore(state, props.simplePath),
          }),
    )
  }

  haptics.medium()

  // Clear isMulticursorExecuting after all operations are complete
  if (isMultiselectOperation) {
    store.dispatch(
      setIsMulticursorExecuting({
        value: false,
      }),
    )
  }

  // alert user of move to another context (only show for the first thought)
  const firstItem = draggedItems[0]
  const sameParent = equalPath(parentOf(firstItem.path), parentOf(props.simplePath))

  if (!sameParent) {
    // wait until after MultiGesture has cleared the error so this alert does not get cleared
    setTimeout(() => {
      store.dispatch((dispatch, getState) => {
        const state = getState()
        const parentThought = getThoughtById(state, head(parentOf(props.simplePath)))
        if (!parentThought) return

        const firstFromThought = pathToThought(state, firstItem.simplePath)
        if (!firstFromThought) return

        const numThoughts = draggedItems.length
        const alertFrom = numThoughts === 1 ? '"' + ellipsize(firstFromThought.value) + '"' : `${numThoughts} thoughts`
        const alertTo = isRoot([parentThought.id]) ? 'home' : '"' + ellipsize(parentThought.value) + '"'
        dispatch(
          alert(`${alertFrom} moved to ${alertTo} context.`, {
            alertType: AlertType.ThoughtMoved,
            clearDelay: 5000,
          }),
        )
      })
    }, 100)
  }
}

/** Collects props from the DragSource. */
const dragCollect = (monitor: DragSourceMonitor) => ({
  isDragging: monitor.isDragging(),
})

/** Collects props from the DropTarget. */
const dropCollect = (monitor: DropTargetMonitor) => ({
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  // is being hovered over current thought irrespective of whether the given item is droppable
  isBeingHoveredOver: monitor.isOver({ shallow: true }),
  isDeepHovering: monitor.isOver(),
  canDropThought: monitor.canDrop(),
})

/** A draggable and droppable Thought hook. */
const useDragAndDropThought = (props: Partial<ThoughtContainerProps>) => {
  const propsTypes = props as ThoughtContainerProps

  const [{ isDragging }, dragSource, dragPreview] = useDrag({
    type: DragAndDropType.Thought,
    item: () => beginDrag(propsTypes),
    canDrag: () => canDrag(propsTypes),
    end: () => endDrag(),
    collect: dragCollect,
  })

  const [{ isHovering, isBeingHoveredOver, isDeepHovering, canDropThought }, dropTarget] = useDrop({
    accept: [DragAndDropType.Thought, NativeTypes.FILE],
    canDrop: (item, monitor) => canDrop(propsTypes, monitor),
    drop: (item, monitor) => drop(propsTypes, monitor),
    collect: dropCollect,
  })

  // Check if this thought is part of a multiselect drag operation
  const isDraggingMultiple = useSelector(state => {
    if (!state.dragInProgress || !state.draggingThought) return false
    return state.draggingThought.some(draggedPath => equalPath(draggedPath, propsTypes.simplePath))
  })

  return {
    isDragging: isDragging || isDraggingMultiple, // Combine both drag states: either this is the primary drag source OR it's part of multiselect drag
    dragSource,
    dragPreview,
    isHovering,
    isBeingHoveredOver,
    isDeepHovering,
    canDropThought,
    dropTarget,
  }
}

export default useDragAndDropThought
