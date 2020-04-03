
import { getThoughtsRanked } from '../util/getThoughtsRanked'
import { isDescendant } from '../util/isDescendant'
import { equalPath } from '../util/equalPath'
import { pathToContext } from '../util/pathToContext'
import { unroot } from '../util/unroot'
import { RANKED_ROOT } from '../constants'

const MAX_DEPTH_FROM_CURSOR = 7

// recursively finds all the visible thought and returns a flat array
const getFlatArray = (startingPath, cursor, isLeaf) => {

  const subThoughts = getThoughtsRanked(startingPath)

  return subThoughts.reduce((acc, child) => {
    const childPath = unroot(startingPath.concat(child))
    const isCursorChildren = isDescendant(pathToContext(cursor), pathToContext(childPath))
    const isCursorAncestor = isDescendant(pathToContext(childPath), pathToContext(cursor))
    const isCursor = equalPath(cursor, childPath)
    const childPathLength = childPath.length

    // decide if it is a distant ancestor that needs to be visible but needs to stop deeper recursion
    const addDistantAncestorAndStop = (cursor.length - childPathLength) <= (isLeaf ? 1 : 0) && (!isCursor && !isCursorAncestor && !isCursorChildren)

    // stop recursion if distant ancestor doesn't need to be added to the array
    if (childPathLength < cursor.length && !isCursorAncestor && !addDistantAncestorAndStop) {
      return acc
    }
    else {

      // stop deeper recursion at certain depth where any descendant of cursor has more than one subthought
      const stop = (addDistantAncestorAndStop || (isCursorChildren && subThoughts.length > 1))

      const distanceFromCursor = cursor.length - childPath.length

      // if true the node will have reduced opacity on render
      const isDistantThought = (
        !isLeaf
          ? (distanceFromCursor >= 0)
          : (distanceFromCursor >= (isCursorAncestor ? 2 : 1))
      )
        && !isCursor

      // limit depth from the cursor
      return (childPath.length - cursor.length >= MAX_DEPTH_FROM_CURSOR)
        ? acc
        : acc.concat([
          { ...child, path: childPath, isSelected: isCursor, isDistantThought, isCursorChildren },
          ...stop ? [] : getFlatArray(childPath, cursor, isLeaf)
        ])
    }
  }, [])
}

export const treeToFlatArray = cursor => {
  const isLeaf = getThoughtsRanked(cursor || []).length === 0

  // determine path of the first thought that would be visible
  const startingPath = cursor ? (cursor.length - (isLeaf ? 3 : 2) > 0 ? cursor.slice(0, cursor.length - (isLeaf ? 3 : 2)) : RANKED_ROOT) : RANKED_ROOT
  return getFlatArray(startingPath, cursor || [], isLeaf)
}
