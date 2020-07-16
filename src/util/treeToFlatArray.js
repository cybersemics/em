import {
  contextOf,
  equalPath,
  isDescendant,
  isFunction,
  pathToContext,
  unroot,
} from '../util'

import {
  attribute,
  attributeEquals,
  getThoughts,
  getThoughtsRanked,
  getThoughtsSorted,
} from '../selectors'

import { store } from '../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../constants'

const MAX_DEPTH_FROM_CURSOR = 7

/**
 *
 */
const hasAttribute = (pathOrContext, attributeName, { state = store.getState() } = {}) => {
  const context = pathToContext(pathOrContext)
  return pathToContext(getThoughts(state, context)).includes(attributeName)
}

/** Given parentPath and its ranked children array returns total no of hidden nodes. */

/**
 *
 */
const calculateDepthInfo = (state, parentPath, childrenArray) => childrenArray.reduce((acc, child) => {
  const childPath = unroot(parentPath.concat(child))
  return {
    hiddenNodes: acc.hiddenNodes + (pathToContext(getThoughtsRanked(state, childPath)).includes('=hidden') ? 1 : 0)
  }
}, {
  hiddenNodes: 0
})

/** Recursively finds all the visible thought and returns a flat array. */
const getFlatArray = ({
  state,
  startingPath,
  cursor,
  children,
  isLeaf,
  showHiddenThoughts,
  isParentCursorAncestor = true,
  isCursorDescendant = false,
  visibleSiblingsCount,
  viewInfo = { table: { tableFirstColumnsAbove: 0, tableSecondColumnsAbove: 0, isActive: false, column: null, firstColumnNode: null } }
} = {}) => {

  const subThoughts = children || getThoughtsRanked(state, startingPath).filter(child => showHiddenThoughts || !isFunction(child.value))
  const isCursorContext = equalPath(startingPath, contextOf(cursor))

  // iterate subthoughts
  return subThoughts.reduce((acc, child, index) => {
    const childPath = unroot(startingPath.concat(child))
    const value = child.value
    const childContext = pathToContext(childPath)

    // isParentCursorAncestor is used to prevent calling isDescendant everytime
    // if the parent thought is already not an ancestor of the cursor then we don't need to call it everytime for its descendants
    const isCursorAncestor =
      isParentCursorAncestor &&
      isDescendant(pathToContext(childPath), pathToContext(cursor))
    const isCursor = equalPath(cursor, childPath)

    const sortPreference = attribute(state, childPath, '=sort')

    const children = sortPreference === 'Alphabetical' ? getThoughtsSorted(state, childPath) : getThoughtsRanked(state, childPath)

    // decide if it is a distant ancestor that needs to be visible but needs to stop deeper recursion
    const addDistantAncestorAndStop =
      cursor.length - childPath.length <= (isLeaf ? 1 : 0) &&
      !isCursor &&
      !isCursorAncestor &&
      !isCursorDescendant
    // stop recursion if distant ancestor doesn't need to be added to the array
    const showDistantAncestor = !(
      childPath.length < cursor.length &&
      !isCursorAncestor &&
      !addDistantAncestorAndStop
    )

    const isTableView = attributeEquals(state, childContext, '=view', 'Table')
    const isPinned = attributeEquals(state, childContext, '=pin', 'true')
    const isChildrenPinned = attributeEquals(state, pathToContext(startingPath), '=pinChildren', 'true')
    const isHidden = hasAttribute(childContext, '=hidden', state)

    const filteredChildren = children.filter(child => !isFunction(child.value) || showHiddenThoughts)

    const metaChildrenCount = children.length - filteredChildren.length

    const isMeta = isFunction(value)

    // hide if this node is itself a meta function or has children meta =hidden
    // if showHiddenThoughts is true then don't hide at all
    const shouldHide = !showHiddenThoughts && isHidden

    const depthInfo = {
      hiddenNodes: acc.depthInfo.hiddenNodes + (isHidden ? 1 : 0),
      metaNodes: acc.depthInfo.metaNodes + (isMeta ? 1 : 0),
    }

    // do not recurse if hidden
    if (!showDistantAncestor || shouldHide) return { ...acc, depthInfo }

    // stop deeper recursion at certain depth where any descendant of cursor has more than one visible subthought
    // stop further deeper recursion if max depth is reached
    const stop =
      (
        (
          viewInfo.table.column !== 1 &&
          (addDistantAncestorAndStop || (isCursorDescendant && (viewInfo.table.column === 2 || visibleSiblingsCount > 1)))
        ) &&
        !isPinned &&
        !isChildrenPinned
      ) ||
      childPath.length - cursor.length === MAX_DEPTH_FROM_CURSOR

    const distanceFromCursor = cursor.length - childPath.length

    // if true the node will have reduced opacity on render
    const isDistantThought =
      (!isLeaf
        ? distanceFromCursor >= 0
        : distanceFromCursor >= (isCursorAncestor ? 2 : 1)) && !isCursor

    const tableInfo = viewInfo.table

    const { depthInfo: childrenDepthInfo, flatArray: flatArrayDescendants } = stop
      ? { depthInfo: calculateDepthInfo(state, childPath, children), flatArray: [] } // stop recursion if stop is true (leaf nodes)
      : getFlatArray({
        startingPath: childPath,
        children: filteredChildren,
        cursor,
        state,
        isLeaf,
        showHiddenThoughts,
        isParentCursorAncestor: isCursorAncestor,
        isCursorDescendant: isCursorDescendant || isCursor,
        visibleSiblingsCount: filteredChildren.length, // children nodes won't have to itearate its siblings
        viewInfo: {
          table: {
            tableFirstColumnsAbove: tableInfo.tableFirstColumnsAbove + (tableInfo.column === 1 ? 1 : 0),
            tableSecondColumnsAbove: tableInfo.tableSecondColumnsAbove + (tableInfo.column === 2 ? 1 : 0),
            column: isTableView ? 1 : tableInfo.column ? tableInfo.column + 1 : null,
            firstColumnNode: tableInfo.column && tableInfo.column === 1 ? child.id : null
          }
        }
      })

    /*
     * This is the logic for showing '▸' or '•' i.e if there would be any visible nodes if we expand this node
     *
     * 1. If there are visible nodes returned from recursive call then show expand icons.
     * 2. Else if children length is less than zero then show '•'.
     * 3. Else if all children nodes are either meta nodes or a node that has hidden attribute (=hidden),
     *    then only show expand icon '▸' if showHiddenThoughts is true else show '•'.
     *
     * For example
     *
     * When showHiddenThoughts is true
     *
     *    ▸ A
     *      ▸ B
     *        ▸ C
     *          ▸ D
     *            • =hidden
     *        • =immovable
     *
     * If showHiddenThoughts is false then thought B despite having two childrens won't render anthing.
     *
     *    ▸ A
     *      ▸ B
     *        • C (So instead of '▸' we show '•')
     *
     */

    const hasChildren =
      children.length > 0 &&
      (showHiddenThoughts || ((childrenDepthInfo.hiddenNodes + metaChildrenCount) !== children.length))

    // limit depth from the cursor
    return {
      flatArray: acc.flatArray.concat([
        {
          ...child,
          path: childPath,
          isCursor,
          key: child.id,
          keyPrevSibling: index > 0 ? subThoughts[index - 1].id : null,
          isDistantThought,
          noAnimationExit: (isCursorContext && isLeaf) || isCursorDescendant,
          isCursorAncestor,
          hasChildren,
          index,
          expanded: flatArrayDescendants.length > 0,
          viewInfo: {
            table: {
              tableFirstColumnsAbove: tableInfo.tableFirstColumnsAbove,
              tableSecondColumnsAbove: tableInfo.tableSecondColumnsAbove,
              isActive: isTableView,
              column: viewInfo.table.column,
              firstColumnNode: viewInfo.table.firstColumnNode,
              index
            }
          }
        },
        // isCursorDescendant is used to prevent cursor descendants to call isDescendant everytime
        ...flatArrayDescendants,
      ]),
      depthInfo
    }
  }, {
    flatArray: [],
    // depthInfo is used to return important details like total hidden and meta nodes of direct childrens to the parent node.
    // this is used to prevent uncessary iteration of children array everytime within a parent scope.
    depthInfo: {
      hiddenNodes: 0,
    },
  })
}

/**
 *
 */
export const treeToFlatArray = (cursor, showHiddenThoughts) => {
  const state = store.getState()
  const isLeaf = getThoughts(state, cursor || [ROOT_TOKEN]).length === 0

  // determine path of the first thought that would be visible
  const startingPath = cursor && cursor.length - (isLeaf ? 3 : 2) > 0
    ? cursor.slice(0, cursor.length - (isLeaf ? 3 : 2))
    : RANKED_ROOT

  // pass the first visible thought if it's parent is a table
  const isTableView = attributeEquals(state, pathToContext(startingPath), '=view', 'Table')

  return getFlatArray({
    startingPath,
    state,
    cursor: cursor || [ROOT_TOKEN],
    isLeaf,
    showHiddenThoughts,
    viewInfo: {
      table: {
        tableFirstColumnsAbove: 0,
        tableSecondColumnsAbove: 0,
        column: isTableView ? 1 : null
      }
    }
  }).flatArray
}
