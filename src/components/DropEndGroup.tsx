import React from 'react'
import { Path } from '../types'
import { GenericObject } from '../utilTypes'
import { store } from '../store'
import { DropTargetMonitor } from 'react-dnd'
import { equalArrays, equalPath, headValue, isDivider, isEM, isRoot, pathToContext, rootedContextOf, subsetThoughts, unroot } from '../util'
import { getNextRank } from '../selectors'
import { DropWrapper } from './DragAndDrop'
import DropEnd from './DropEnd'

interface DropEndObject {
    key: string,
    thoughtsRanked: Path,
    showContexts: boolean,
    xOffset: number,
}

interface DropEndGroupProps {
    expanded: boolean,
    showContexts: boolean,
    thoughtsRanked: Path,
    dropEndObject: GenericObject, // TO-DO: create a proper type for this
}

interface DropProps {
    thoughtsRanked: Path,
    showContexts?: boolean,
}

// this is approximate width of part of node at the left side of the bullet in rem.
const LEFT_ADJUST_WIDTH = 0.6

// height of drop end in rem.
const DROP_END_HEIGHT = 0.25

// x offset to the right for the child drop in rem.
const CHILD_DROP_XOFFSET = 4

// child drop end height in rem.
const CHILD_DROP_END_HEIGHT = 1.4

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

/** Drop end for child context and for next sibling for the last child in the context. */
const DropEndGroup = ({ expanded, showContexts, thoughtsRanked, dropEndObject }: DropEndGroupProps) => {

  return (
    <div style={{ position: 'relative' }}>
      {
        dropEndObject && dropEndObject.map(({ key, thoughtsRanked, showContexts, xOffset }: DropEndObject) => {
          return (
            <div key={key} style={{ height: `${DROP_END_HEIGHT}rem` }}>
              <DropWrapper
                canDrop={(item, monitor) => canDropAsChild({ thoughtsRanked }, monitor)}
                onDrop={(item, monitor) => dropAsChild({ thoughtsRanked, showContexts }, monitor)}
              >
                {
                  ({ isDragging, isOver, drop }) => {
                    return isDragging ?
                      <DropEnd
                        innerRef={drop}
                        dropStyle={{
                          transform: `translateX(${xOffset + LEFT_ADJUST_WIDTH}rem)`,
                          height: `${DROP_END_HEIGHT}rem`,
                        }}
                        indicatorStyle={{}}
                        showIndicator={isOver}
                      />
                      : null
                  }
                }
              </DropWrapper>
            </div>
          )
        })
      }
      {/*
          Drop as child.
          - a
            - <--- Drop --->
        */}
      { !expanded && <DropWrapper
        canDrop={(item, monitor) => canDropAsChild({ thoughtsRanked }, monitor)}
        onDrop={(item, monitor) => dropAsChild({ thoughtsRanked, showContexts }, monitor)}
      >
        {
          ({ isDragging, isOver, drop }) => {
            return isDragging ?
              <DropEnd
                innerRef={drop}
                dropStyle={{
                  transform: `translateX(${CHILD_DROP_XOFFSET}rem)`,
                  height: `${CHILD_DROP_END_HEIGHT}rem`,
                  width: `calc(100% - ${CHILD_DROP_XOFFSET}rem)`,
                  bottom: `${-CHILD_DROP_END_HEIGHT + 0.4}rem`,
                }}
                indicatorStyle={{
                  transform: `translateX(-2rem) translateY(0.1rem)`
                }}
                showIndicator={isOver}
              />
              : null
          }
        }
      </DropWrapper>
      }
    </div>
  )
}

export default DropEndGroup
