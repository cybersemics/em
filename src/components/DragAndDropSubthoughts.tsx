import { store } from '../store'
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import SimplePath from '../@types/SimplePath'
import { isDescendantPath } from '../util/isDescendantPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import appendToPath from '../util/appendToPath'
import isRoot from '../util/isRoot'
import isEM from '../util/isEM'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import attribute from '../selectors/attribute'
import equalPath from '../util/equalPath'
import pathToContext from '../util/pathToContext'
import getPrevRank from '../selectors/getPrevRank'
import getNextRank from '../selectors/getNextRank'
import { HOME_TOKEN } from '../constants'
import ellipsize from '../util/ellipsize'
import alert from '../action-creators/alert'
import error from '../action-creators/error'
import { SubthoughtsProps, ConnectedSubthoughtsProps } from './Subthoughts'
import { FC } from 'react'

export type ConnectedDragAndDropSubthoughtsProps = ConnectedSubthoughtsProps & ReturnType<typeof dropCollect>

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
const canDrop = (props: SubthoughtsProps, monitor: DropTargetMonitor) => {
  const { simplePath: thoughtsFrom } = monitor.getItem() as { simplePath: SimplePath }
  const { cursor, expandHoverTopPath, thoughts } = store.getState()

  const { path } = props

  /** If the epxand hover top is active then all the descenendants of the current active expand hover top path should be droppable. */
  const isExpandedTop = () =>
    path && expandHoverTopPath && path.length >= expandHoverTopPath.length && isDescendantPath(path, expandHoverTopPath)

  const distance = cursor ? cursor.length - props.simplePath.length : 0
  const isHidden = distance >= 2 && !isExpandedTop()

  // there is no self thought to check since this is <Subthoughts>
  const isDescendant = isDescendantPath(props.simplePath, thoughtsFrom)

  const toThought = thoughts.thoughtIndex[head(props.simplePath)]
  const divider = isDivider(toThought.value)

  // do not drop on descendants or thoughts hidden by autofocus
  return !isHidden && !isDescendant && !divider
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

      store.dispatch(alert(`${alertFrom} moved to ${alertTo}.`, { alertType: 'moveThought', clearDelay: 5000 }))
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
