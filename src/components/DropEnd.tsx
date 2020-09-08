import React, { CSSProperties } from 'react'
import { Path } from '../types'
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { store } from '../store'
import { equalArrays, equalPath, headValue, isDivider, isEM, isRoot, pathToContext, rootedContextOf, subsetThoughts, unroot } from '../util'
import { getNextRank } from '../selectors'

export interface DropEndProps {
    connectDropTarget: (el: JSX.Element) => any,
    dropStyle?: CSSProperties,
    indicatorStyle?: CSSProperties,
    color?: string,
    isOver?: boolean,
    isDragging?: boolean,
}

interface DropProps {
  thoughtsRanked: Path,
  showContexts?: boolean,
}

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
const canDropAsChild = (props: DropProps, monitor: DropTargetMonitor) => {

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRanked
  const cursor = store.getState().cursor
  const distance = cursor ? cursor.length - thoughtsTo.length : 0
  const isHidden = distance >= 2
  // there is no self thought to check since this is <Subthoughts>
  const isDescendant = subsetThoughts(thoughtsTo, thoughtsFrom)
  const divider = isDivider(headValue(thoughtsTo))

  // do not drop on descendants or thoughts hidden by autofocus
  return !isHidden && !isDescendant && !divider
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dropAsChild = (props: DropProps, monitor: DropTargetMonitor) => {

  const state = store.getState()

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRanked

  const newPath = unroot(thoughtsTo).concat({
    value: headValue(thoughtsFrom),
    rank: getNextRank(state, pathToContext(thoughtsTo))
  })

  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedContextOf(pathToContext(thoughtsFrom))
  const newContext = rootedContextOf(pathToContext(newPath))
  const sameContext = equalArrays(oldContext, newContext)

  // cannot drop on itself
  if (equalPath(thoughtsFrom, newPath)) return

  // cannot move root or em context or target is divider
  if (isDivider(headValue(thoughtsTo)) || (isRootOrEM && !sameContext)) {
    store.dispatch({ type: 'error', value: `Cannot move the ${isEM(thoughtsFrom) ? 'em' : 'home'} context to another context.` })
    return
  }

  store.dispatch(props.showContexts
    ? {
      type: 'newThoughtSubmit',
      value: headValue(thoughtsTo),
      context: pathToContext(thoughtsFrom),
      rank: getNextRank(state, thoughtsFrom)
    }
    : {
      type: 'existingThoughtMove',
      oldPath: thoughtsFrom,
      newPath
    }
  )

  // alert user of move to another context
  if (!sameContext) {

    // // wait until after MultiGesture has cleared the error so this alert does no get cleared
    // setTimeout(() => {
    //   const alertFrom = '"' + ellipsize(headValue(thoughtsFrom)) + '"'
    //   const alertTo = isRoot(newContext)
    //     ? 'home'
    //     : '"' + ellipsize(headValue(thoughtsTo)) + '"'

    //   alert(`${alertFrom} moved to ${alertTo} context.`)
    //   clearTimeout(globals.errorTimer)
    //   // @ts-ignore
    //   globals.errorTimer = window.setTimeout(() => alert(null), 5000)
    // }, 100)
  }
}

/** Drop specification. */
const spec = {
  canDrop: canDropAsChild,
  drop: dropAsChild,
}

/** Collect. */
const collect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  isDragging: monitor.getItem(),
})

/**
 * Drop End component.
 */
const DropEnd = ({ connectDropTarget, dropStyle, indicatorStyle, isOver, isDragging, color }: DropEndProps & DropProps) => {
  return isDragging ?
    connectDropTarget(<div
      className='drop-wrapper'
      style={{
        position: 'absolute',
        transform: 'translateX(0.4rem)',
        height: '1.2rem',
        width: 'calc(100% - 0.4rem)',
        ...dropStyle,
      }}
    >
      {
        isOver &&
          <div
            style={{
              background: color,
              ...indicatorStyle,
            }}
            className='drop-hover-new'>
          </div>
      }
    </div>
    ) : null
}

const DroppableDropEnd = DropTarget('move', spec, collect)(DropEnd)
DroppableDropEnd.displayName = 'DropEnd'

export default DroppableDropEnd
