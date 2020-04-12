import {
  contextOf,
  unroot,
  pathToContext,
  equalPath,
  isDescendant,
  getThoughtsRanked,
  head
} from '../util'

import { RANKED_ROOT } from '../constants'

const MAX_DEPTH_FROM_CURSOR = 7

// recursively finds all the visible thought and returns a flat array
const getFlatArray = (startingPath, cursor, isLeaf, isParentCursorAncestor = true, isCursorChildren = false) => {

  const parentNode = head(startingPath) || RANKED_ROOT[0]

  const subThoughts = getThoughtsRanked(startingPath)
  const checkIfContextOfCursor = equalPath(startingPath, contextOf(cursor))

  // iterate subthoughts
  return subThoughts.reduce((acc, child) => {
    const childPath = unroot(startingPath.concat(child))

    // isParentCursorAncestor is used to prevent calling isDescendant everytime
    // if the parent thought is already not an ancestor of the cursor then we don't need to call it everytime for its descendants
    const isCursorAncestor = isParentCursorAncestor && isDescendant(pathToContext(childPath), pathToContext(cursor))
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
          { ...child,
            path: childPath,
            isSelected: isCursor,
            key: `${parentNode.value}-${parentNode.rank}-${child.value}-${child.rank}-${childPathLength}`,
            isDistantThought,
            isCursorChildren,
            noAnimationExit: (checkIfContextOfCursor && isLeaf) || isCursorChildren,
            isCursorAncestor,
          },
          // isCursorChildren is used to prevent cursor descendants to call isDescendant everytime
          ...stop ? [] : getFlatArray(childPath, cursor, isLeaf, isCursorAncestor, isCursorChildren || isCursor)
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
