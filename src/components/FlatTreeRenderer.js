import React from 'react'
import { connect } from 'react-redux'
import { getThoughtsRanked } from '../util/getThoughtsRanked'
import { RANKED_ROOT } from '../constants'
import { isDescendant } from '../util/isDescendant'
import { equalPath } from '../util/equalPath'
import { pathToContext } from '../util/pathToContext'
import { unroot } from '../util/unroot'
import { contextOf } from '../util/contextOf'
import {
  TransitionGroup,
  CSSTransition
} from 'react-transition-group'

const mapStateToProps = ({ cursor, contextIndex, thoughtIndex }) => ({ cursor, contextIndex, thoughtIndex })

const MAX_DEPTH_FROM_CURSOR = 7

const treeToFlatArray = (startingPath, cursor, isLeaf) => {

  const subThoughts = getThoughtsRanked(startingPath)

  return subThoughts.reduce((acc, child) => {
    const childPath = unroot(startingPath.concat(child))
    const isCursorChildren = isDescendant(pathToContext(cursor), pathToContext(childPath))
    const isCursorAncestor = isDescendant(pathToContext(childPath), pathToContext(cursor))
    const isCursor = equalPath(cursor, childPath)
    const childPathLength = childPath.length
    const addDistantAncestorAndStop = (cursor.length - childPathLength) <= (isLeaf ? 1 : 0) && (!isCursor && !isCursorAncestor && !isCursorChildren)

    if (childPathLength < cursor.length && !isCursorAncestor && !addDistantAncestorAndStop) {
      return acc
    }
    else {
      const stop = (addDistantAncestorAndStop || (isCursorChildren && subThoughts.length > 1))

      const distanceFromCursor = cursor.length - childPath.length

      const isDistantThought = (
        !isLeaf
          ? (distanceFromCursor >= 0)
          : (distanceFromCursor >= (isCursorAncestor ? 2 : 1))
      )
        && !isCursor

      return (childPath.length - cursor.length >= MAX_DEPTH_FROM_CURSOR)
        ? acc
        : acc.concat([
          { ...child, path: childPath, isSelected: isCursor, isDistantThought },
          ...stop ? [] : treeToFlatArray(childPath, cursor, isLeaf)
        ])
    }
  }, [])
}

const FlatTreeRenderer = ({ cursor, contextIndex, thoughtIndex }) => {

  const isLeaf = getThoughtsRanked(cursor || []).length === 0
  const startingPath = cursor ? (cursor.length - (isLeaf ? 3 : 2) > 0 ? cursor.slice(0, cursor.length - (isLeaf ? 3 : 2)) : RANKED_ROOT) : RANKED_ROOT
  const flatArray = treeToFlatArray(startingPath, cursor || [], isLeaf)

  const visibleDepth = flatArray.length > 0 ? flatArray[0].path.length : 0

  const firstVisibleThoughtPath = flatArray.length > 0 ? flatArray[0].path : []

  const invisibleThoughtsAboveCount = firstVisibleThoughtPath.reduce((acc, node, i) => {
    const context = pathToContext(firstVisibleThoughtPath.slice(0, i).length === 0 ? RANKED_ROOT : firstVisibleThoughtPath.slice(0, i))
    const noOfThoughtsAbove = getThoughtsRanked(context).findIndex(thought => thought.rank >= node.rank) + 1
    return acc + noOfThoughtsAbove
  }, 0) - 1

  const flatArrayRef = React.useRef(flatArray)

  React.useEffect(() => {
    flatArrayRef.current = flatArray
  })

  return (
    <div style={{ position: 'relative' }}>
      <TransitionGroup className="todo-list">
        {flatArray.map((node, i) => {
          const style = { position: 'absolute', top: `${(invisibleThoughtsAboveCount + i) * 30}px`, left: `${(node.path.length - visibleDepth) * 2}rem`, display: 'block', margin: '0.5rem 0' }
          const key = `${contextOf(node.path).value}-${node.value}-${node.path.length}`
          return (
            <CSSTransition key={key} timeout={750} classNames='flat-render-node'>
              <input className='flat-render-node-position' style={style} value={node.value} onChange={() => {}}/>
            </CSSTransition>
          )
        })}
      </TransitionGroup>
    </div>
  )
}

export default connect(mapStateToProps)(FlatTreeRenderer)
