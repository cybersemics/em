import {
  equalPath,
  isDescendant,
  isFunction,
  pathToContext,
  unroot,
} from '.'

import {
  attribute,
  attributeEquals,
  chain,
  getChildPath,
  getContextsSortedAndRanked,
  getThoughts,
  getThoughtsRanked,
  getThoughtsSorted,
  isContextViewActive,
  pathToThoughtsRanked,
  splitChain,
} from '../selectors'

import { store } from '../store'
import { RANKED_ROOT } from '../constants'
import { headValue } from './headValue'
import { head } from './head'
import { headId } from './headId'

import { Child, Context, Path, ThoughtContext } from '../types'
import { State } from './initialState'
import { Nullable } from '../utilTypes'

const MAX_DEPTH_FROM_CURSOR = 7

interface TableViewInfo {
  tableFirstColumnsAbove: number,
  tableSecondColumnsAbove: number,
  isActive?: boolean,
  column: Nullable<number>,
  firstColumnNode?: Nullable<string>,
  index?: number,
}

interface ContextViewInfo {
  active: boolean,
  hasContext: boolean,
}

interface ViewInfo {
  table: TableViewInfo,
  context: ContextViewInfo,
}

interface GetFlatArrayProps {
  state: State,
  startingPath: Path,
  showContextsParent: boolean,
  cursor: Path,
  children: Child[],
  contextChain: Path[],
  isLeaf?: boolean,
  depth: number,
  showHiddenThoughts?: boolean,
  isParentCursorAncestor?: boolean,
  isCursorDescendant?: boolean,
  visibleSiblingsCount: number,
  parentKey: string,
  viewInfo: {
    table: TableViewInfo,
  },
}

export interface FlatArrayNode {
    value?: string,
    path: Path,
    thoughtsRanked: Path,
    thoughtsResolved: Path,
    isCursor: boolean,
    depth: number,
    key: string, // TO-DO: make sure id is always available
    keyPrevSibling: Nullable<string>,
    isDistantThought: boolean,
    isCursorAncestor: boolean,
    hasChildren: boolean,
    index: number,
    dropEnd: string[],
    parentKey?: string,
    expanded: boolean,
    childrenLength: number,
    contextChain: Path[],
    isLastChild: boolean,
    viewInfo: ViewInfo,
}

interface GetFlatArrayReturn {
  flatArray: FlatArrayNode[],
  depthInfo: {
    hiddenNodes: number,
    metaNodes: number,
  },
}

// eslint-disable-next-line
const hasAttribute = (pathOrContext: Path | Context, attributeName: string, { state = store.getState() } = {} as { state: State }) => {
  const context = pathToContext(pathOrContext)
  return pathToContext(getThoughts(state, context)).includes(attributeName)
}

// eslint-disable-next-line
const calculateDepthInfo = (state: State, parentPath: Path, childrenArray: Child[]) => childrenArray.reduce((acc, child) => {
  const childPath = unroot(parentPath.concat(child))
  return {
    hiddenNodes: acc.hiddenNodes + (pathToContext(getThoughtsRanked(state, childPath)).includes('=hidden') ? 1 : 0)
  }
}, {
  hiddenNodes: 0
})

// eslint-disable-next-line
const thoughtsContextToChild = (thoughtsContextArr: ThoughtContext[]): Child[] => thoughtsContextArr.map(thoughtContext => {
  const { context, ...rest } = thoughtContext
  return {
    ...rest,
    value: head(context)
  }
})

/** Recursively finds all the visible thought and returns a flat array. */
const getFlatArray = ({
  state,
  startingPath,
  showContextsParent,
  cursor,
  children: subThoughts,
  contextChain = [],
  isLeaf,
  depth,
  showHiddenThoughts,
  isParentCursorAncestor = true,
  isCursorDescendant = false,
  visibleSiblingsCount,
  parentKey,
  viewInfo = { table: { tableFirstColumnsAbove: 0, tableSecondColumnsAbove: 0, isActive: false, column: null, firstColumnNode: null } }
} = {} as GetFlatArrayProps): GetFlatArrayReturn => {

  // iterate subthoughts
  return subThoughts.reduce((acc: GetFlatArrayReturn, child: Child, index: number) => {
    const childPath = getChildPath(state, child, startingPath, showContextsParent)
    const thoughtsResolved = contextChain.length > 0 ? chain(state, contextChain, childPath) : childPath

    const value = child.value

    const childContext = pathToContext(childPath)

    // isParentCursorAncestor is used to prevent calling isDescendant everytime
    // if the parent thought is already not an ancestor of the cursor then we don't need to call it everytime for its descendants
    const isCursorAncestor =
      isParentCursorAncestor &&
      isDescendant(pathToContext(thoughtsResolved), pathToContext(cursor))

    const isCursor = equalPath(cursor, thoughtsResolved)

    const sortPreference = attribute(state, childPath, '=sort')

    const activeContextView = isContextViewActive(state, pathToContext(thoughtsResolved))

    const children = activeContextView ? thoughtsContextToChild(getContextsSortedAndRanked(state, headValue(childPath))) : sortPreference === 'Alphabetical' ? getThoughtsSorted(state, pathToContext(childPath)) : getThoughtsRanked(state, childPath)

    // decide if it is a distant ancestor that needs to be visible but needs to stop deeper recursion
    const addDistantAncestorAndStop =
      cursor.length - thoughtsResolved.length <= (isLeaf ? 1 : 0) &&
      !isCursor &&
      !isCursorAncestor &&
      !isCursorDescendant

    // stop recursion if distant ancestor doesn't need to be added to the array
    const showDistantAncestor = !(
      thoughtsResolved.length < cursor.length &&
      !isCursorAncestor &&
      !addDistantAncestorAndStop
    )

    const isTableView = attributeEquals(state, childContext, '=view', 'Table') !== undefined
    const isPinned = attributeEquals(state, childContext, '=pin', 'true')
    const isChildrenPinned = attributeEquals(state, pathToContext(startingPath), '=pinChildren', 'true')
    const isHidden = hasAttribute(childContext, '=hidden', { state })

    const filteredChildren = children.filter(child => {
      return !isFunction(child.value) || showHiddenThoughts
    })

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
      childPath.length - cursor.length === MAX_DEPTH_FROM_CURSOR ||
      (activeContextView && filteredChildren.length <= 1)

    const distanceFromCursor = cursor.length - childPath.length

    // if true the node will have reduced opacity on render
    const isDistantThought =
      (!isLeaf
        ? distanceFromCursor >= 0
        : distanceFromCursor >= (isCursorAncestor ? 2 : 1)) && !isCursor

    const tableInfo = viewInfo.table

    // const thoughtsResolved = contextChain && contextChain.length > 0
    //   ? chain(state, contextChain, thoughtsRanked)
    //   : unroot(thoughtsRanked)

    const key = (showContextsParent ? headId(startingPath) ?? '' + child.id : child.id) ?? ''

    const { depthInfo: childrenDepthInfo, flatArray: flatArrayDescendants } = stop
      ? { depthInfo: calculateDepthInfo(state, childPath, children), flatArray: [] } // stop recursion if stop is true (leaf nodes)
      : getFlatArray({
        startingPath: childPath,
        children: filteredChildren,
        depth: depth + 1,
        cursor,
        state,
        isLeaf,
        parentKey: key,
        showHiddenThoughts,
        contextChain: activeContextView ? contextChain.concat([childPath]) : contextChain,
        isParentCursorAncestor: isCursorAncestor,
        isCursorDescendant: isCursorDescendant || isCursor,
        showContextsParent: activeContextView,
        visibleSiblingsCount: filteredChildren.length, // children nodes won't have to itearate its siblings
        viewInfo: {
          table: {
            tableFirstColumnsAbove: tableInfo.tableFirstColumnsAbove + (tableInfo.column === 1 ? 1 : 0),
            tableSecondColumnsAbove: tableInfo.tableSecondColumnsAbove + (tableInfo.column === 2 ? 1 : 0),
            column: isTableView ? 1 : tableInfo.column ? tableInfo.column + 1 : null,
            firstColumnNode: tableInfo.column && tableInfo.column === 1 ? child.id ?? null : null
          }
        }
      })

    const isLastChild = visibleSiblingsCount - 1 === index
    const lastDescendantNode = isLastChild ? flatArrayDescendants.slice(-1)[0] : undefined

    const updatedFlatTreeDescendants = lastDescendantNode ? flatArrayDescendants.slice(0, -1)
      .concat(
        [{ ...lastDescendantNode, dropEnd: [...lastDescendantNode.dropEnd].concat(key ?? []) }])
      : flatArrayDescendants

    const hasChildren =
      children.length > 0 &&
      (showHiddenThoughts || ((childrenDepthInfo.hiddenNodes + metaChildrenCount) !== children.length))

    // limit depth from the cursor

    const keyPrevSibling = index > 0 ? subThoughts[index - 1].id ?? null : null
    const dropEnd = isLastChild && flatArrayDescendants.length === 0 && key ? [key] : []
    return {
      flatArray: acc.flatArray.concat([
        {
          ...child,
          path: childPath,
          thoughtsRanked: childPath,
          thoughtsResolved,
          isCursor,
          depth: depth + 1,
          key,
          keyPrevSibling,
          isDistantThought,
          isCursorAncestor,
          hasChildren,
          index,
          dropEnd,
          parentKey,
          expanded: flatArrayDescendants.length > 0 || (activeContextView && isCursor),
          childrenLength: filteredChildren.length,
          contextChain,
          isLastChild,
          viewInfo: {
            table: {
              tableFirstColumnsAbove: tableInfo.tableFirstColumnsAbove,
              tableSecondColumnsAbove: tableInfo.tableSecondColumnsAbove,
              isActive: isTableView,
              column: viewInfo.table.column,
              firstColumnNode: viewInfo.table.firstColumnNode,
              index
            },
            context: {
              active: activeContextView,
              hasContext: activeContextView && filteredChildren.length > 1
            }
          }
        },
        // isCursorDescendant is used to prevent cursor descendants to call isDescendant everytime
        ...updatedFlatTreeDescendants,
      ]),
      depthInfo
    }
  }, {
    flatArray: [],
    // depthInfo is used to return important details like total hidden and meta nodes of direct childrens to the parent node.
    // this is used to prevent uncessary iteration of children array everytime within a parent scope.
    depthInfo: {
      hiddenNodes: 0,
      metaNodes: 0
    },
  })
}

/**
 * Calculate starting path based on cursor and initiate recursive getFlatArrayWith necessary params.
 */
export const treeToFlatArray = (state: State, cursor: Nullable<Path>): FlatArrayNode[] => {
  const isLeaf = cursor !== null && getThoughts(state, pathToContext(cursor)).length === 0
  const showHiddenThoughts = state.showHiddenThoughts

  // determine path of the first thought that would be visible
  const startingPath = cursor && cursor.length - (isLeaf ? 3 : 2) > 0
    ? cursor.slice(0, cursor.length - (isLeaf ? 3 : 2))
    : RANKED_ROOT

  const contextChain = splitChain(state, startingPath)

  const isTableView = attributeEquals(state, pathToContext(startingPath), '=view', 'Table')

  const sortPreference = attribute(state, startingPath, '=sort')

  const activeContextView = isContextViewActive(state, pathToContext(startingPath))

  const thoughtsRanked = pathToThoughtsRanked(state, startingPath)

  const children = activeContextView ? thoughtsContextToChild(getContextsSortedAndRanked(state, headValue(startingPath))) : sortPreference === 'Alphabetical' ? getThoughtsSorted(state, pathToContext(thoughtsRanked)) : getThoughtsRanked(state, thoughtsRanked)

  const filteredChildren = children.filter(child => {
    return !isFunction(child.value) || showHiddenThoughts
  })

  return getFlatArray({
    children: filteredChildren,
    contextChain: activeContextView || contextChain.length > 1 ? contextChain.slice(0, contextChain.length - 1).concat(activeContextView ? [thoughtsRanked] : []) : [],
    startingPath: thoughtsRanked,
    showContextsParent: activeContextView,
    state,
    cursor: cursor || RANKED_ROOT,
    isLeaf,
    depth: 0,
    parentKey: headId(thoughtsRanked) ?? '',
    showHiddenThoughts,
    visibleSiblingsCount: filteredChildren.length,
    viewInfo: {
      table: {
        tableFirstColumnsAbove: 0,
        tableSecondColumnsAbove: 0,
        column: isTableView ? 1 : null
      }
    }
  }).flatArray
}
