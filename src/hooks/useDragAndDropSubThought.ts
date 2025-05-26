import { DropTargetMonitor, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import DragAndDropType from '../@types/DragAndDropType'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtOrFiles from '../@types/DragThoughtOrFiles'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import { alertActionCreator as alert } from '../actions/alert'
import { errorActionCreator as error } from '../actions/error'
import { importFilesActionCreator as importFiles } from '../actions/importFiles'
import { moveThoughtActionCreator as moveThought } from '../actions/moveThought'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { AlertType, HOME_TOKEN } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import getNextRank from '../selectors/getNextRank'
import getPrevRank from '../selectors/getPrevRank'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import visibleDistanceAboveCursor from '../selectors/visibleDistanceAboveCursor'
import store from '../stores/app'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import equalPath from '../util/equalPath'
import haptics from '../util/haptics'
import hashPath from '../util/hashPath'
import head from '../util/head'
import headValue from '../util/headValue'
import isDescendantPath from '../util/isDescendantPath'
import isDivider from '../util/isDivider'
import isDraggedFile from '../util/isDraggedFile'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import useDragLeave from './useDragLeave'
import useHoveringPath from './useHoveringPath'

interface DroppableSubthoughts {
  path: Path
  simplePath?: SimplePath
  showContexts?: boolean
}

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
// Fires much less frequently than DragAndDropThought:canDrop
const canDrop = ({ path: thoughtsTo }: DroppableSubthoughts, monitor: DropTargetMonitor): boolean => {
  const state = store.getState()

  const item = monitor.getItem() as DragThoughtOrFiles
  const thoughtsFrom = (item as DragThoughtItem).path

  /** If the epxand hover top is active then all the descenendants of the current active expand hover top path should be droppable. */
  const isExpandedTop = () =>
    state.expandHoverUpPath &&
    thoughtsTo.length >= state.expandHoverUpPath.length &&
    isDescendantPath(thoughtsTo, state.expandHoverUpPath)

  /** Returns true if the thought is the closest hidden parent of the thought. */
  const isClosestHiddenParent = () => {
    // first visible thought not hidden by autofocus
    const firstVisible =
      state.expandHoverUpPath || (state.cursor && (state.cursor.slice(0, -visibleDistanceAboveCursor(state)) as Path))
    return !!firstVisible && equalPath(rootedParentOf(state, firstVisible), thoughtsTo)
  }

  /** Returns true if the thought is hidden by autofocus. */
  const isHidden = () => {
    // Note: The distance calculation for SubthoughtsDrop is 1 less than the ThoughtDrop (in DragAndDropThought.canDrop)
    const distance = state.cursor ? state.cursor.length - thoughtsTo.length - 1 : 0
    return distance >= visibleDistanceAboveCursor(state) && !isExpandedTop()
  }

  return (
    // dragInProgress can be set to false to abort the drag (e.g. by shaking)
    state.dragInProgress &&
    // do not drop on thoughts hidden by autofocus
    (!isHidden() || isClosestHiddenParent()) &&
    // do not drop on descendants
    !isDescendantPath(thoughtsTo, thoughtsFrom) &&
    // do not drop on dividers
    !isDivider(getThoughtById(state, head(thoughtsTo))?.value) &&
    // do not drop on context view
    !isContextViewActive(state, thoughtsTo)
  )
}

/** Moves a thought on drop, or imports a file on drop. */
const drop = (props: DroppableSubthoughts, monitor: DropTargetMonitor) => {
  const state = store.getState()

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const item = monitor.getItem() as DragThoughtOrFiles
  if (isDraggedFile(item)) {
    store.dispatch(importFiles({ path: props.path, files: item.files }))
    return
  }

  // Handle multiselect drag operations
  const draggedItem = item as unknown as DragThoughtItem[]

  // Set isMulticursorExecuting for multiselect operations to group them as a single undo operation
  const isMultiselectOperation = draggedItem.length > 1
  if (isMultiselectOperation) {
    store.dispatch(
      setIsMulticursorExecuting({
        value: true,
        undoLabel: 'Move Thoughts',
      }),
    )
  }

  // Sort by original rank to preserve order
  const sortedItems = [...draggedItem].sort((a, b) => {
    const thoughtA = pathToThought(state, a.simplePath)
    const thoughtB = pathToThought(state, b.simplePath)
    if (!thoughtA || !thoughtB) return 0
    return thoughtA.rank - thoughtB.rank
  })

  // Process each thought
  for (let i = 0; i < sortedItems.length; i++) {
    const thoughtItem = sortedItems[i]
    const thoughtsFrom = thoughtItem.path

    if (!thoughtsFrom) {
      console.warn('item.path not defined', { item: thoughtItem })
      continue
    } else if (!props.path) {
      console.warn('props.path not defined', { item: thoughtItem })
      continue
    }
    // Recompute state for each move
    const currentState = store.getState()
    const pathTo = appendToPath(
      props.showContexts ? simplifyPath(currentState, props.path) : props.path,
      head(thoughtsFrom),
    )

    const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
    const thoughtTo = getThoughtById(currentState, head(rootedParentOf(currentState, pathTo)))
    const thoughtFrom = getThoughtById(currentState, head(thoughtsFrom))
    const parentIdFrom = head(rootedParentOf(currentState, thoughtsFrom))
    const parentIdTo = head(rootedParentOf(currentState, pathTo))
    const sameContext = parentIdFrom === parentIdTo
    const isExpanded = !!currentState.expanded[hashPath(rootedParentOf(currentState, pathTo))]

    const dropTop = !isExpanded && attributeEquals(currentState, parentIdTo, '=drop', 'top')

    // cannot drop on itself
    if (!thoughtFrom || !thoughtTo || equalPath(thoughtsFrom, props.simplePath)) continue

    // cannot move root or em context or target is divider
    if (isDivider(thoughtTo?.value) || (isRootOrEM && !sameContext)) {
      store.dispatch(
        error({ value: `Cannot move the ${isEM(thoughtsFrom) ? 'em' : 'home'} context to another context.` }),
      )
      continue
    }

    haptics.medium()

    // Calculate rank with offset to maintain order
    const baseRank = (dropTop ? getPrevRank : getNextRank)(currentState, thoughtTo.id)
    const rankOffset = i * 0.001
    const newRank = baseRank + rankOffset

    store.dispatch(
      moveThought({
        oldPath: thoughtsFrom,
        newPath: pathTo,
        newRank,
      }),
    )

    // Alert for context move (only for first thought)
    if (i === 0 && !sameContext) {
      setTimeout(() => {
        const alertFrom = '"' + ellipsize(thoughtFrom.value) + '"'
        const alertTo = parentIdTo === HOME_TOKEN ? 'home' : '"' + ellipsize(thoughtTo.value) + '"'
        const inContext = props.showContexts
          ? ` in the context of ${ellipsize(headValue(currentState, props.simplePath ?? props.path) ?? 'MISSING_CONTEXT')}`
          : ''

        const numThoughts = sortedItems.length
        const finalAlertFrom = numThoughts === 1 ? alertFrom : `${numThoughts} thoughts`

        store.dispatch(
          alert(`${finalAlertFrom} moved to${dropTop ? ' top of' : ''} ${alertTo}${inContext}.`, {
            alertType: AlertType.ThoughtMoved,
            clearDelay: 5000,
          }),
        )
      }, 100)
    }
  }

  // Clear isMulticursorExecuting after all operations are complete
  if (isMultiselectOperation) {
    store.dispatch(
      setIsMulticursorExecuting({
        value: false,
      }),
    )
  }
}

/** Creates the props for drop. */
const dropCollect = (monitor: DropTargetMonitor) => ({
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  // is being hovered over current thought irrespective of whether the given item is droppable
  isBeingHoveredOver: monitor.isOver({ shallow: true }),
  isDeepHovering: monitor.isOver(),
  canDropThought: monitor.canDrop(),
})

/** A draggable and droppable SubThought hook. */
const useDragAndDropSubThought = (props: DroppableSubthoughts) => {
  const [{ isHovering, isBeingHoveredOver, isDeepHovering, canDropThought }, dropTarget] = useDrop({
    accept: [DragAndDropType.Thought, NativeTypes.FILE],
    canDrop: (item, monitor) => canDrop(props, monitor),
    drop: (item, monitor) => drop(props, monitor),
    collect: dropCollect,
  })

  useHoveringPath(props.path, isHovering, DropThoughtZone.SubthoughtsDrop)
  useDragLeave({ isDeepHovering, canDropThought })

  return { isHovering, isBeingHoveredOver, isDeepHovering, dropTarget }
}

export default useDragAndDropSubThought
