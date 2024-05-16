import { FC } from 'react'
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtOrFiles from '../@types/DragThoughtOrFiles'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import VirtualThoughtProps from '../@types/VirtualThoughtProps'
import { alertActionCreator as alert } from '../actions/alert'
import { errorActionCreator as error } from '../actions/error'
import { importFilesActionCreator as importFiles } from '../actions/importFiles'
import { moveThoughtActionCreator as moveThought } from '../actions/moveThought'
import { AlertType, HOME_TOKEN } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import getNextRank from '../selectors/getNextRank'
import getPrevRank from '../selectors/getPrevRank'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import visibleDistanceAboveCursor from '../selectors/visibleDistanceAboveCursor'
import store from '../stores/app'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import equalPath from '../util/equalPath'
import head from '../util/head'
import headValue from '../util/headValue'
import isDescendantPath from '../util/isDescendantPath'
import isDivider from '../util/isDivider'
import isDraggedFile from '../util/isDraggedFile'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'

interface DroppableSubthoughts {
  path: Path
  simplePath: SimplePath
  showContexts?: boolean
}

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
// Fires much less frequently than DragAndDropThought:canDrop
export const canDrop = (props: DroppableSubthoughts, monitor: DropTargetMonitor): boolean => {
  const state = store.getState()

  // dragInProgress can be set to false to abort the drag (e.g. by shaking)
  if (!state.dragInProgress) return false

  const item = monitor.getItem() as DragThoughtOrFiles
  const thoughtsFrom = (item as DragThoughtItem).path
  const thoughtsTo = props.path

  /** If the epxand hover top is active then all the descenendants of the current active expand hover top path should be droppable. */
  const isExpandedTop = () =>
    props.path &&
    state.expandHoverUpPath &&
    props.path.length >= state.expandHoverUpPath.length &&
    isDescendantPath(props.path, state.expandHoverUpPath)

  // first visible thought not hidden by autofocus
  const firstVisible =
    state.expandHoverUpPath || (state.cursor && (state.cursor.slice(0, -visibleDistanceAboveCursor(state)) as Path))

  const isClosestHiddenParent = !!firstVisible && equalPath(rootedParentOf(state, firstVisible), thoughtsTo)
  // Note: The distance calculation for SubthoughtsDrop is 1 less than the ThoughtDrop (in DragAndDropThought.canDrop)
  const distance = state.cursor ? state.cursor.length - thoughtsTo.length - 1 : 0
  const isHidden = distance >= visibleDistanceAboveCursor(state) && !isExpandedTop()
  const isDescendant = isDescendantPath(thoughtsTo, thoughtsFrom)
  const divider = isDivider(getThoughtById(state, head(thoughtsTo)).value)

  const showContexts = thoughtsTo && isContextViewActive(state, thoughtsTo)

  // do not drop on descendants or thoughts hidden by autofocus
  return (!isHidden || isClosestHiddenParent) && !isDescendant && !divider && !showContexts
}

// eslint-disable-next-line jsdoc/require-jsdoc
const drop = (props: VirtualThoughtProps, monitor: DropTargetMonitor) => {
  const state = store.getState()

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const item = monitor.getItem() as DragThoughtOrFiles
  if (isDraggedFile(item)) {
    store.dispatch(importFiles({ path: props.path, files: item.files }))
    return
  }

  const thoughtsFrom = item.path

  if (!thoughtsFrom) {
    console.warn('item.path not defined', { item: monitor.getItem() })
    return
  } else if (!props.path) {
    console.warn('props.path not defined', { item: monitor.getItem() })
    return
  }

  const pathTo = appendToPath(props.showContexts ? simplifyPath(state, props.path) : props.path, head(thoughtsFrom))

  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const thoughtTo = getThoughtById(state, head(rootedParentOf(state, pathTo)))
  const thoughtFrom = getThoughtById(state, head(thoughtsFrom))
  const parentIdFrom = head(rootedParentOf(state, thoughtsFrom))
  const parentIdTo = head(rootedParentOf(state, pathTo))
  const sameContext = parentIdFrom === parentIdTo
  const dropTop = attributeEquals(state, parentIdTo, '=drop', 'top')

  // cannot drop on itself
  if (equalPath(thoughtsFrom, props.simplePath)) return

  // cannot move root or em context or target is divider
  if (isDivider(thoughtTo.value) || (isRootOrEM && !sameContext)) {
    store.dispatch(
      error({ value: `Cannot move the ${isEM(thoughtsFrom) ? 'em' : 'home'} context to another context.` }),
    )
    return
  }

  store.dispatch(
    moveThought({
      oldPath: thoughtsFrom,
      newPath: pathTo,
      newRank: (dropTop ? getPrevRank : getNextRank)(state, thoughtTo.id),
    }),
  )

  // alert user of move to another context
  if (!sameContext) {
    // wait until after MultiGesture has cleared the error so this alert does no get cleared
    setTimeout(() => {
      const alertFrom = '"' + ellipsize(thoughtFrom.value) + '"'
      const alertTo = parentIdTo === HOME_TOKEN ? 'home' : '"' + ellipsize(thoughtTo.value) + '"'
      const inContext = props.showContexts ? ` in the context of ${ellipsize(headValue(state, props.simplePath))}` : ''

      store.dispatch(
        alert(`${alertFrom} moved to${dropTop ? ' top of' : ''} ${alertTo}${inContext}.`, {
          alertType: AlertType.ThoughtMoved,
          clearDelay: 5000,
        }),
      )
    }, 100)
  }
}

/** Creates the props for drop. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
})

/** A droppable Subthoughts component. */
const DragAndDropSubthoughts = <T extends VirtualThoughtProps>(virtualThoughtComponent: FC<T>) =>
  DropTarget(
    ['thought', NativeTypes.FILE],
    { canDrop, drop },
    dropCollect,
  )(virtualThoughtComponent as FC<VirtualThoughtProps>)

export default DragAndDropSubthoughts
