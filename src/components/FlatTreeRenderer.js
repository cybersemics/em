import React from 'react'
import { connect } from 'react-redux'
import { getThoughtsRanked } from '../util/getThoughtsRanked'
import { RANKED_ROOT } from '../constants'
import { isDescendant } from '../util/isDescendant'
// import { isDescendant } from '../util/isDescendant'
import { equalPath } from '../util/equalPath'
import { pathToContext } from '../util/pathToContext'
import { unroot } from '../util/unroot'
// import { head } from '../util/head'
// import { getContexts } from '../util/getContexts'
// import { getThought } from '../util/getThought'

const mapStateToProps = ({ cursor, contextIndex, thoughtIndex }) => ({ cursor, contextIndex, thoughtIndex })

const MAX_DEPTH_FROM_CURSOR = 7

const treeToFlatArray = (startingPath, cursor, isLeaf) => {

  const subThoughts = getThoughtsRanked(startingPath)

  console.log(startingPath, subThoughts, isLeaf, 'subThoughts')

  return subThoughts.reduce((acc, child) => {
    const childPath = unroot(startingPath.concat(child))
    const isCursorChildren = isDescendant(pathToContext(cursor), pathToContext(childPath))
    const isCursorAncestor = isDescendant(pathToContext(childPath), pathToContext(cursor))
    const isCursor = equalPath(cursor, childPath)
    const childPathLength = childPath.length
    const addDistantAncestorAndStop = (cursor.length - childPathLength) <= (isLeaf ? 1 : 0) && (!isCursor && !isCursorAncestor && !isCursorChildren)

    console.log(child.value, isCursorAncestor, addDistantAncestorAndStop, childPathLength, cursor.length, 'childPath')

    if (childPathLength < cursor.length && !isCursorAncestor && !addDistantAncestorAndStop) {
      console.log(child.value, 'stop')
      return acc
    }
    else {
      const stop = (addDistantAncestorAndStop || (isCursorChildren && subThoughts.length > 1))
      return (childPath.length - cursor.length >= MAX_DEPTH_FROM_CURSOR)
        ? acc
        : acc.concat([
          child,
          ...stop ? [] : treeToFlatArray(childPath, cursor, isLeaf)
        ])
    }
  }, [])
}

const FlatTreeRenderer = ({ cursor, contextIndex, thoughtIndex }) => {

  const isLeaf = getThoughtsRanked(cursor).length === 0
  const startingPath = cursor ? (cursor.length - (isLeaf ? 3 : 2) > 0 ? cursor.slice(0, cursor.length - (isLeaf ? 3 : 2)) : RANKED_ROOT) : RANKED_ROOT

  console.log(cursor, startingPath)
  console.log(treeToFlatArray(startingPath, cursor, isLeaf), 'cursor')

  return (
    <div>
      {/* {data.map((node) => {
        const style = { position: 'relative', left: `${node.depth}rem`, display: 'block', margin: '0.5rem 0' }
        return <input style={style} key={node.parentHash + node.rank} value={node.value} onFocus={() => { onFocus(node.hash) }} />
      })} */}
    </div>
  )
}

export default connect(mapStateToProps)(FlatTreeRenderer)
