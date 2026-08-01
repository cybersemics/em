import moize from 'moize'
import { DragSourceMonitor, DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { useDispatch, useSelector } from 'react-redux'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtOrFiles from '../@types/DragThoughtOrFiles'
import DragThoughtZone from '../@types/DragThoughtZone'
import DropThoughtZone from '../@types/DropThoughtZone'
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
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { isTouch } from '../browser'
import MoveThoughtAlert from '../components/MoveThoughtAlert'
import { ThoughtContainerProps } from '../components/Thought'
import { AlertType, LongPressState } from '../constants'
import allowTouchToScroll from '../device/allowTouchToScroll'
import * as selection from '../device/selection'
import documentSort from '../selectors/documentSort'
import findDescendant from '../selectors/findDescendant'
import getNextRank from '../selectors/getNextRank'
import getRankAfter from '../selectors/getRankAfter'
import getRankBefore from '../selectors/getRankBefore'
import hasMulticursor from '../selectors/hasMulticursor'
import isBefore from '../selectors/isBefore'
import isContextViewActive from '../selectors/isContextViewActive'
import isMulticursorPath from '../selectors/isMulticursorPath'
import pathToThought from '../selectors/pathToThought'
import simplifyPath from '../selectors/simplifyPath'
import store from '../stores/app'
import selectionRangeStore from '../stores/selectionRangeStore'
import appendToPath from '../util/appendToPath'
import equalPath from '../util/equalPath'
import haptics from '../util/haptics'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import isDocumentEditable from '../util/isDocumentEditable'
import isDraggedFile from '../util/isDraggedFile'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import throttleByMousePosition from '../util/throttleByMousePosition'

export type DropValidationResult = {
  isValid: boolean
  errorMessage?: string
  errorType?: 'warning' | 'error'
}

/** Returns true if the thought can be dragged. */
const canDrag = (props: ThoughtContainerProps) => {
  const hasSelectionRange = selectionRangeStore.getState()
  if (isTouch && hasSelectionRange) return false

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
  const draggedItems = isDraggedFile(item) ? [] : item

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

  const draggedItems = isDraggedFile(item) ? [] : item

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

  // Validate each dragged item once. A no-op drop (dropping a thought on or immediately before itself) is a valid
  // drop target that simply does not move that thought; it returns isValid:false with no errorMessage. Only genuine
  // errors (e.g. moving the root/em context) carry an errorMessage and abort the entire drop. This distinction is
  // what allows a multiselect drop where one selected thought is a no-op (e.g. dropping b above b) to still move the
  // remaining selected thoughts.
  const validations = draggedItems.map(item => ({
    item,
    result: validateDraggedItem(state, item.simplePath, props.simplePath),
  }))

  // Abort the drop only if an item produced an actual error or warning (not a no-op).
  if (
    validations.some(({ result: { isValid, errorMessage, errorType } }) => {
      if (isValid || !errorMessage) return false

      if (errorType === 'warning') {
        console.warn(errorMessage)
      } else if (errorType === 'error') {
        store.dispatch(error({ value: errorMessage }))
      }

      return true
    })
  )
    return

  store.dispatch((dispatch, getState) => {
    // set multicursor executing to true if there are multiple thoughts being dragged
    if (draggedItems.length > 1) {
      dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'Dragging Thoughts' }))
    }

    const parent = parentOf(props.simplePath)

    // Move each dragged item to the destination path, preserving document order. The first item is placed before the
    // drop target; each subsequent item is placed after the previous one. No-op items (dropping a thought on or before
    // itself) are not moved, but still anchor the position of the following items so the original order is preserved.
    let prevPath: SimplePath | null = null
    validations.forEach(({ item, result }) => {
      const state = getState()
      const newPath = appendToPath(parent, head(item.simplePath))
      const toThought = pathToThought(state, props.simplePath)
      const thoughtFrom = item.simplePath

      if (props.showContexts) {
        dispatch(
          createThought({
            value: toThought?.value ?? '',
            path: thoughtFrom,
            rank: getNextRank(state, head(thoughtFrom)),
          }),
        )
      } else if (result.isValid) {
        dispatch(
          moveThought({
            oldPath: thoughtFrom,
            newPath,
            newRank: prevPath ? getRankAfter(state, prevPath) : getRankBefore(state, props.simplePath),
          }),
        )
      }

      prevPath = newPath
    })

    // Clear isMulticursorExecuting after all operations are complete and isMulticursorExecuting is true
    if (getState().isMulticursorExecuting) {
      dispatch(setIsMulticursorExecuting({ value: false }))
    }

    haptics.medium()

    // Alert user if context changed
    const hasContextChanged = draggedItems.every(
      item => !equalPath(parentOf(item.simplePath), parentOf(props.simplePath)),
    )

    if (hasContextChanged) {
      // wait until after MultiGesture has cleared the error so this alert does not get cleared
      setTimeout(() => {
        const state = getState()
        const firstFromThought = pathToThought(state, draggedItems[0].simplePath)
        if (!firstFromThought) return

        dispatch(
          alert(() => (
            <MoveThoughtAlert from={firstFromThought.value} numThoughts={draggedItems.length} toPath={parent} />
          )),
        )
      }, 100)
    }
  })
}

/** Handles drag end. Resets longPress to Inactive so that gestures, alerts, and the multicursor are restored once the drag concludes, and re-enables native scrolling. This react-dnd callback is guaranteed to fire whenever a drag ends (dropped or not), which is more reliable than the touchend-based reset in useDragHold that may not fire (e.g. multicursor drop onto a subthought). Scrolling is re-enabled here because useLongPress disables it via allowTouchToScroll(false) on long-press start and only restores it on touchend, which does not fire once a drag has begun (see useLongPress.stop). */
const endDrag = () => {
  // Re-enable native scrolling. allowTouchToScroll(false) attaches an unconditional preventDefault touchmove listener on
  // long-press start that blocks all scrolling; it is only removed on touchend, which does not fire after a drag (e.g. a
  // multiselect drop onto a subthought), leaving scrolling frozen until it is explicitly re-enabled here.
  allowTouchToScroll(true)
  store.dispatch([
    longPress({ value: LongPressState.Inactive }),
    (dispatch, getState) => {
      if (getState().alert?.alertType === AlertType.DragAndDropHint) {
        dispatch(alert(null))
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
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  isDeepHovering: monitor.isOver(),
  canDropThought: monitor.canDrop(),
})

/** A draggable and droppable Thought hook. */
const useDragAndDropThought = (props: Partial<ThoughtContainerProps> & { hoverZone: DropThoughtZone }) => {
  const propsTypes = props as ThoughtContainerProps
  const dispatch = useDispatch()

  const [{ isDragging: isDraggingBullet }, dragSourceBullet, dragPreview] = useDrag({
    type: DragAndDropType.Thought,
    item: () => beginDrag(propsTypes),
    canDrag: () => canDrag(propsTypes),
    end: () => endDrag(),
    collect: dragCollect,
  })

  const [{ isDragging: isDraggingEditable }, dragSourceEditable] = useDrag({
    type: DragAndDropType.Thought,
    item: () => beginDrag(propsTypes),
    canDrag: () => canDrag(propsTypes),
    end: () => endDrag(),
    collect: dragCollect,
  })

  const [{ isHovering, isDeepHovering, canDropThought }, dropTarget] = useDrop({
    accept: [DragAndDropType.Thought, NativeTypes.FILE],
    canDrop: (item, monitor) => canDrop(propsTypes, monitor),
    drop: (item, monitor) => drop(propsTypes, monitor),
    collect: dropCollect,
    hover: (_, monitor) =>
      throttleByMousePosition(() => {
        // is being hovered over current thought irrespective of whether the given item is
        if (!monitor.isOver({ shallow: true })) return

        dispatch((dispatch, getState) => {
          const state = getState()

          // If the drag has been canceled, ignore hoveringPath behavior
          if (
            state.longPress === LongPressState.DragCanceled ||
            (state.hoveringPath === props.path && state.hoverZone === props.hoverZone)
          )
            return

          dispatch(
            longPress({
              value: state.longPress,
              draggingThoughts: state.draggingThoughts,
              hoveringPath: props.path,
              hoverZone: props.hoverZone,
              sourceZone: DragThoughtZone.Thoughts,
            }),
          )
        })
      }, monitor.getClientOffset()),
  })

  // Check if this thought is part of a multiselect drag operation
  const isDraggingMultiple = useSelector(state => {
    if (state.longPress !== LongPressState.DragInProgress || !state.draggingThoughts) return false
    return state.draggingThoughts.some(draggedPath => equalPath(draggedPath, propsTypes.simplePath))
  })

  return {
    isDragging: isDraggingBullet || isDraggingEditable || isDraggingMultiple, // Combine both drag states: either this is the primary drag source OR it's part of multiselect drag
    dragSourceBullet,
    dragSourceEditable,
    dragPreview,
    isHovering,
    isDeepHovering,
    canDropThought,
    dropTarget,
  }
}

export default useDragAndDropThought
