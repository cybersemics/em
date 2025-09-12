import moize from 'moize'
import { DragSourceMonitor, DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { useSelector } from 'react-redux'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtOrFiles from '../@types/DragThoughtOrFiles'
import DragThoughtZone from '../@types/DragThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { alertActionCreator as alert } from '../actions/alert'
import { createThoughtActionCreator as createThought } from '../actions/createThought'
import { errorActionCreator as error } from '../actions/error'
import { importFilesActionCreator as importFiles } from '../actions/importFiles'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { moveThoughtActionCreator as moveThought } from '../actions/moveThought'
import { setDroppedPathActionCreator as setDroppedPath } from '../actions/setDroppedPath'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { ThoughtContainerProps } from '../components/Thought'
import { LongPressState } from '../constants'
import * as selection from '../device/selection'
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
import simplifyPath from '../selectors/simplifyPath'
import store from '../stores/app'
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

export type DropValidationResult = {
  isValid: boolean
  errorMessage?: string
  errorType?: 'warning' | 'error'
}

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
const beginDrag = ({ path }: ThoughtContainerProps): DragThoughtItem[] => {
  const state = store.getState()
  const offset = selection.offset()
  const isMulticursorActive = hasMulticursor(state)
  const isCurrentThoughtSelected = isMulticursorPath(state, path)

  // Add the current thought to the multicursor if it is not already selected
  if (isMulticursorActive && !isCurrentThoughtSelected) {
    store.dispatch(addMulticursor({ path }))
  }

  const multicursorPaths = [...Object.values(state.multicursors), ...(!isCurrentThoughtSelected ? [path] : [])]

  const draggingThoughts = documentSort(state, multicursorPaths).map(path => ({
    path,
    simplePath: simplifyPath(state, path),
    zone: DragThoughtZone.Thoughts,
  }))

  store.dispatch([
    longPress({
      value: LongPressState.DragInProgress,
      draggingThoughts: draggingThoughts.map(item => item.simplePath),
      sourceZone: DragThoughtZone.Thoughts,
      ...(offset != null ? { offset } : null),
    }),
  ])

  return draggingThoughts
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
  if (state.longPress !== LongPressState.DragInProgress) return false

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

  // Validation checks
  if (draggedItems.some(item => !item.path)) {
    console.warn('item.path not defined')
    return
  } else if (!props.path) {
    console.warn('props.path not defined')
    return
  }

  /** Validates that the dragged items can be dropped at the destination path. */
  const validateDraggedItem = (state: State, thoughtFrom: SimplePath, thoughtTo: SimplePath): DropValidationResult => {
    const toThought = pathToThought(state, thoughtTo)
    const fromThought = pathToThought(state, thoughtFrom)
    const isRootOrEM = isRoot(thoughtFrom) || isEM(thoughtFrom)
    const sameParent = equalPath(parentOf(thoughtFrom), parentOf(thoughtTo))

    if (!toThought || !fromThought) {
      return { isValid: false, errorMessage: 'toThought or fromThought not defined', errorType: 'warning' }
    }

    // cannot move root or em context
    if (isRootOrEM && !sameParent) {
      return {
        isValid: false,
        errorMessage: `Cannot move the ${isRoot(thoughtFrom) ? 'home' : 'em'} context to another context.`,
        errorType: 'error',
      }
    }

    // drop on itself or after itself is a noop
    if (equalPath(thoughtFrom, thoughtTo) || isBefore(state, thoughtFrom, thoughtTo)) return { isValid: false }

    return { isValid: true }
  }

  const state = store.getState()

  // If any drop is invalid, abort the drop early
  if (
    draggedItems.some(({ simplePath }) => {
      const { isValid, errorMessage, errorType } = validateDraggedItem(state, simplePath, props.simplePath)

      if (!isValid && errorMessage) {
        if (errorType === 'warning') {
          console.warn(errorMessage)
        } else if (errorType === 'error') {
          store.dispatch(error({ value: errorMessage }))
        }
      }

      return !isValid
    })
  )
    return

  store.dispatch((dispatch, getState) => {
    // set multicursor executing to true if there are multiple thoughts being dragged
    if (draggedItems.length > 1) {
      dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'Dragging Thoughts' }))
    }

    // move each dragged item to the destination path
    draggedItems.forEach(item => {
      const state = getState()
      const parent = parentOf(props.simplePath)
      const newPath = appendToPath(parent, head(item.simplePath))
      const toThought = pathToThought(state, props.simplePath)
      const thoughtFrom = item.simplePath

      dispatch(
        props.showContexts
          ? createThought({
              value: toThought?.value ?? '',
              path: thoughtFrom,
              rank: getNextRank(state, head(thoughtFrom)),
            })
          : moveThought({
              oldPath: thoughtFrom,
              newPath,
              newRank: getRankBefore(state, props.simplePath),
            }),
      )
    })

    // Clear isMulticursorExecuting after all operations are complete and isMulticursorExecuting is true
    if (getState().isMulticursorExecuting) {
      dispatch(setIsMulticursorExecuting({ value: false }))
    }

    haptics.medium()

    // set post-drop highlight on destination parent so the pulse continues briefly at a slower rate
    const destinationParent = parentOf(props.simplePath)
    dispatch(setDroppedPath({ path: destinationParent }))

    // Alert user if context changed
    const hasContextChanged = draggedItems.every(
      item => !equalPath(parentOf(item.simplePath), parentOf(props.simplePath)),
    )

    if (hasContextChanged) {
      // wait until after MultiGesture has cleared the error so this alert does not get cleared
      setTimeout(() => {
        const state = getState()
        const parentThought = getThoughtById(state, head(parentOf(props.simplePath)))
        if (!parentThought) return

        const firstFromThought = pathToThought(state, draggedItems[0].simplePath)
        if (!firstFromThought) return

        const numThoughts = draggedItems.length
        const alertFrom = numThoughts === 1 ? `"${ellipsize(firstFromThought.value)}"` : `${numThoughts} thoughts`
        const alertTo = isRoot([parentThought.id]) ? 'home' : `"${ellipsize(parentThought.value)}"`

        dispatch(
          alert(`${alertFrom} moved to ${alertTo} context.`, {
            clearDelay: 5000,
          }),
        )
      }, 100)
    }
  })
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
    if (state.longPress !== LongPressState.DragInProgress || !state.draggingThoughts) return false
    return state.draggingThoughts.some(draggedPath => equalPath(draggedPath, propsTypes.simplePath))
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
