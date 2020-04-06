import React from 'react'
import { connect } from 'react-redux'
import {
  Transition,
  TransitionGroup,
} from 'react-transition-group'

import { store } from '../store'

// util
import { contextOf, getThoughtsRanked, pathToContext, treeToFlatArray } from '../util'

// constant
import { RANKED_ROOT } from '../constants'

// todo: use cursorBeforeEdit instead of cursor to avoid re-rendering on every edit
// currently using usual cursor for development
const mapStateToProps = ({ cursor }) => ({ cursor })

const FlatTreeRenderer = ({ cursor }) => {

  const flatArray = treeToFlatArray(cursor)

  // depth of the first visible thought
  const visibleDepth = flatArray.length > 0 ? flatArray[0].path.length : 0

  const firstVisibleThoughtPath = flatArray.length > 0 ? flatArray[0].path : []

  // calculate total no of invisible thoughts above the visible one for styling top offest
  const invisibleThoughtsAboveCount = firstVisibleThoughtPath.reduce((acc, node, i) => {
    const context = pathToContext(firstVisibleThoughtPath.slice(0, i).length === 0 ? RANKED_ROOT : firstVisibleThoughtPath.slice(0, i))
    const noOfThoughtsAbove = getThoughtsRanked(context).findIndex(thought => thought.rank >= node.rank) + 1
    return acc + noOfThoughtsAbove
  }, 0) - 1

  const oldInvisibleThoughtsAboveCountRef = React.useRef(invisibleThoughtsAboveCount)

  React.useEffect(() => {
    // storing prev invisible thought counts to compare between re-render
    oldInvisibleThoughtsAboveCountRef.current = invisibleThoughtsAboveCount
  })

  return (
    <div style={{ position: 'relative', marginLeft: '10rem', marginTop: '5rem' }}>
      <TransitionGroup>
        {flatArray.map((node, i) => {

          const style = { transition: `opacity 750ms ease-in-out, transform 750ms ease-in-out`, display: 'block', position: 'absolute', top: `${(invisibleThoughtsAboveCount + i) * 30}px`, margin: '0.5rem 0' }

          /*
            unique key for each nodes.
            current implementation doesn't account for two thoughts with same value within same context
           */
          const key = `${contextOf(node.path).value}-${node.value}-${node.path.length}`

          const nodeLeft = `${(node.path.length - visibleDepth) * 1.2}rem`
          const parentLeft = `${Math.max((node.path.length - visibleDepth + 1) * 1.2, 0)}rem`

          /*
            some children nodes on mount should animate their left position based on the direct parent current animation state

            For example:

            - a
              - b
              - c
              - e

            on selecting thought c

            -a
              - b
              - c
                - d
              - e

            At such cases where c will start animating to the left, and its children thought d on mount should start animating along with parent c.

            With current implementation animation only works properly if parent doesn't have on going animation. If parent is already animating
            then we don't have access to animation state of the parent to adjust childrens animation.
          */
          const animateIncomingNodeAccToParent = node.isCursorChildren && invisibleThoughtsAboveCount !== oldInvisibleThoughtsAboveCountRef.current

          // dynamically changing timeout to stop exit animation for some cases
          // still lacks proper logic for handling the exit animation
          return (
            <Transition key={key} timeout={{ enter: 0, exit: 750 }}>
              {
                state => {

                  // we need isCursorRanked to stop any unmounting nodes from animating

                  // the Transition component uses functional rendering and on entering exiting state it doesn't get any updated variable from the HOC
                  // Since we can only access instance of old cursor here even after re-render, we use store.getState to access the new cursor
                  // todo: we need another way to solve this issue
                  const isCursorRankedRoot = !store.getState().cursor || store.getState().cursor.length === 0
                  const noAnimationExit = node.noAnimationExit || isCursorRankedRoot

                  const transitionStyles = {
                    entering: { opacity: node.isCursorChildren ? 1 : 0, transform: `translateX(${animateIncomingNodeAccToParent ? parentLeft : nodeLeft})` },
                    entered: { opacity: node.isDistantThought ? 0.35 : 1, transform: `translateX(${nodeLeft})` },
                    exiting: { transform: `translateX(${nodeLeft})`, ...noAnimationExit ? { display: 'none' } : { opacity: 0 } },
                  }

                  return (
                    <div
                      style={{ ...style, ...transitionStyles[state] }}
                    >
                      {node.value}
                    </div>
                  )
                }
              }
            </Transition>
          )
        })}
      </TransitionGroup>
    </div>
  )
}

export default connect(mapStateToProps)(FlatTreeRenderer)
