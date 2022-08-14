import { FC } from 'react'
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import alert from '../action-creators/alert'
import error from '../action-creators/error'
import { AlertType, HOME_TOKEN } from '../constants'
import attribute from '../selectors/attribute'
import getNextRank from '../selectors/getNextRank'
import getPrevRank from '../selectors/getPrevRank'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import visibleDistanceAboveCursor from '../selectors/visibleDistanceAboveCursor'
import { store } from '../store'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import equalPath from '../util/equalPath'
import head from '../util/head'
import { isDescendantPath } from '../util/isDescendantPath'
import isDivider from '../util/isDivider'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import pathToContext from '../util/pathToContext'
import { ConnectedSubthoughtsProps, SubthoughtsProps } from './Subthoughts'

export type ConnectedDragAndDropSubthoughtsProps = ConnectedSubthoughtsProps & ReturnType<typeof dropCollect>

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
const canDrop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {
  const state = store.getState()

  // dragInProgress can be set to false to abort the drag (e.g. by shaking)
  if (!state.dragInProgress) return false

  const { simplePath: thoughtsFrom } = monitor.getItem() as { simplePath: SimplePath }
  const thoughtsTo = props.simplePath!

  /** If the epxand hover top is active then all the descenendants of the current active expand hover top path should be droppable. */
  const isExpandedTop = () =>
    props.path &&
    state.expandHoverTopPath &&
    props.path.length >= state.expandHoverTopPath.length &&
    isDescendantPath(props.path, state.expandHoverTopPath)

  // first visible thought not hidden by autofocus
  const firstVisible =
    state.expandHoverTopPath || (state.cursor && (state.cursor.slice(0, -visibleDistanceAboveCursor(state)) as Path))

  const isClosestHiddenParent = equalPath(firstVisible, rootedParentOf(state, thoughtsTo))
  // Note: The distance calculation for SubthoughtsDrop is 1 less than the ThoughtDrop (in DragAndDropThought.canDrop)
  const distance = state.cursor ? state.cursor.length - thoughtsTo.length - 1 : 0
  const isHidden = distance >= visibleDistanceAboveCursor(state) && !isExpandedTop()
  const isDescendant = isDescendantPath(thoughtsTo, thoughtsFrom)
  const divider = isDivider(getThoughtById(state, head(thoughtsTo)).value)

  // do not drop on descendants or thoughts hidden by autofocus
  return (!isHidden || isClosestHiddenParent) && !isDescendant && !divider
}

// eslint-disable-next-line jsdoc/require-jsdoc
const drop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {
  const state = store.getState()

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { simplePath: thoughtsFrom } = monitor.getItem() as { simplePath: SimplePath }

  const pathTo = appendToPath(props.simplePath, head(thoughtsFrom))

  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const thoughtTo = getThoughtById(state, head(props.simplePath))
  const thoughtFrom = getThoughtById(state, head(thoughtsFrom))
  const parentIdFrom = head(rootedParentOf(state, thoughtsFrom))
  const parentIdTo = head(rootedParentOf(state, pathTo))
  const sameContext = parentIdFrom === parentIdTo
  const dropTop = attribute(state, parentIdTo, '=drop') === 'top'

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
    props.showContexts
      ? {
          type: 'createThought',
          value: thoughtTo.value,
          context: pathToContext(state, thoughtsFrom),
          rank: (dropTop ? getPrevRank : getNextRank)(state, head(thoughtsFrom)),
        }
      : {
          type: 'moveThought',
          oldPath: thoughtsFrom,
          newPath: pathTo,
          newRank: (dropTop ? getPrevRank : getNextRank)(state, thoughtTo.id),
        },
  )

  // alert user of move to another context
  if (!sameContext) {
    // wait until after MultiGesture has cleared the error so this alert does no get cleared
    setTimeout(() => {
      const alertFrom = '"' + ellipsize(thoughtFrom.value) + '"'
      const alertTo = parentIdTo === HOME_TOKEN ? 'home' : '"' + ellipsize(thoughtTo.value) + '"'

      store.dispatch(
        alert(`${alertFrom} moved to ${alertTo}.`, { alertType: AlertType.ThoughtMoved, clearDelay: 5000 }),
      )
    }, 100)
  }
}

/** Creates the props for drop. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isDragInProgress: monitor.getItem() as boolean,
  isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop(),
})

/** A droppable Subthoughts component. */
const DragAndDropSubthoughts = (subthoughtsComponent: FC<ConnectedDragAndDropSubthoughtsProps>) =>
  DropTarget('thought', { canDrop, drop }, dropCollect)(subthoughtsComponent)

export default DragAndDropSubthoughts
