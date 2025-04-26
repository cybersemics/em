import { pick } from 'lodash'
import React from 'react'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import TreeThought from '../@types/TreeThought'
import { HOME_PATH } from '../constants'
import calculateAutofocus from '../selectors/calculateAutofocus'
import findDescendant from '../selectors/findDescendant'
import getChildren, { childrenFilterPredicate, getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import { appendToPathMemo } from '../util/appendToPath'
import equalPath from '../util/equalPath'
import groupPaths from '../util/groupPaths'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import parseLet from '../util/parseLet'
import safeRefMerge from '../util/safeRefMerge'
import attributeEquals from './attributeEquals'

// style properties that accumulate down the hierarchy.
// We need to accmulate positioning like marginLeft so that all descendants' positions are indented with the thought.
const ACCUM_STYLE_PROPERTIES = ['marginLeft', 'paddingLeft']

/** Generates a VirtualThought key that is unique across context views. */
// include the head of each context view in the path in the key, otherwise there will be duplicate keys when the same thought is visible in normal view and context view
const crossContextualKey = (contextChain: Path[] | undefined, id: ThoughtId) =>
  `${(contextChain || []).map(head).join('')}|${id}`

/** Recursiveley calculates the tree of visible thoughts, in order, represented as a flat list of thoughts with tree layout information. */
const linearizeTree = (
  state: State,
  {
    // Base path to start the traversal. Defaults to HOME_PATH.
    basePath,
    /** Used to set belowCursor in recursive calls. Once true, all remaining thoughts will have belowCursor: true. See: TreeThought.belowCursor. */
    belowCursor,
    // The id of a specific context within the context view.
    // This allows the contexts to render the children of their Lexeme instance rather than their own children.
    // i.e. a/~m/b should render b/m's children rather than rendering b's children. Notice that the Path a/~m/b contains a different m than b/m, so we need to pass the id of b/m to the next level to render the correct children.
    // If we rendered the children as usual, the Lexeme would be repeated in each context, i.e. a/~m/a/m/x and a/~m/b/m/y. There is no need to render m a second time since we know the context view is activated on m.
    contextId,
    // accumulate the context chain in order to provide a unique key for rendering the same thought in normal view and context view
    contextChain,
    depth,
    env,
    indexDescendant,
    // ancestor styles that accmulate such as marginLeft are applied, merged, and passed to descendants
    styleAccum,
    // =grandparent styles must be passed separately since they skip a level
    styleFromGrandparent,
  }: {
    basePath?: Path
    belowCursor?: boolean
    contextId?: ThoughtId
    contextChain?: SimplePath[]
    depth: number
    env?: LazyEnv
    indexDescendant: number
    styleAccum?: React.CSSProperties | null
    styleFromGrandparent?: React.CSSProperties | null
  } = {
    depth: 0,
    indexDescendant: 0,
  },
): TreeThought[] => {
  const path = basePath || HOME_PATH
  const hashedPath = hashPath(path)
  if (!isRoot(path) && !state.expanded[hashedPath] && !state.expandHoverDownPaths[hashedPath]) return []

  const thoughtId = head(path)
  const thought = getThoughtById(state, thoughtId)
  const simplePath = simplifyPath(state, path)
  const contextViewActive = isContextViewActive(state, path)
  const contextChainNew = contextViewActive ? [...(contextChain || []), simplePath] : contextChain
  const children = contextViewActive
    ? thought
      ? getContextsSortedAndRanked(state, thought.value)
      : []
    : // context children should render the children of a specific Lexeme instance to avoid repeating the Lexeme.
      // See: contextId (above)
      getChildrenRanked(state, contextId || thoughtId)
  const filteredChildren = children.filter(childrenFilterPredicate(state, simplePath))

  // short circuit if the context view only has one context and the NoOtherContexts component will be displayed
  if (contextViewActive && filteredChildren.length === 1) return []

  const childrenAttributeId = findDescendant(state, thoughtId, '=children')
  const grandchildrenAttributeId = findDescendant(state, thoughtId, '=grandchildren')
  const styleChildren = getStyle(state, childrenAttributeId)
  const style = safeRefMerge(styleAccum, styleChildren, styleFromGrandparent)

  const thoughts = filteredChildren.reduce<TreeThought[]>((accum, filteredChild, i) => {
    // If the context view is active, render the context's parent instead of the context itself.
    // This allows the path to be accumulated correctly across the context view.
    // e.g. a/m~/b should render the children of b/m, not a/m
    const child = contextViewActive ? getThoughtById(state, filteredChild.parentId) : filteredChild
    // Context thought may still be pending
    if (!child) return accum
    const childPath = appendToPathMemo(path, child.id)
    const lastVirtualIndex = accum.length > 0 ? accum[accum.length - 1].indexDescendant : 0
    const virtualIndexNew = indexDescendant + lastVirtualIndex + (depth === 0 && i === 0 ? 0 : 1)
    const envParsed = parseLet(state, path)
    const envNew =
      env && Object.keys(env).length > 0 && Object.keys(envParsed).length > 0 ? { ...env, ...envParsed } : undefined

    // As soon as the cursor is found, set belowCursor to true. It will be propagated to every subsequent thought.
    // See: TreeThought.belowCursor
    const isCursor = !belowCursor && equalPath(childPath, state.cursor)
    if (isCursor || !state.cursor) {
      belowCursor = true
    }

    const isEmpty = child.value === ''
    const isTable = attributeEquals(state, child.id, '=view', 'Table')
    const isTableCol1 = attributeEquals(state, head(simplePath), '=view', 'Table')
    const isInSortedContext = attributeEquals(state, head(simplePath), '=sort', 'Alphabetical')
    const isTableCol2 = attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table')
    const isTableCol2Child = attributeEquals(state, head(rootedParentOf(state, parentOf(simplePath))), '=view', 'Table')
    const autofocus = calculateAutofocus(state, childPath)

    const node: TreeThought = {
      belowCursor: !!belowCursor,
      depth: depth, // + (contextViewActive ? thoughtToPath(state, child.id).length - 1 : 0),
      env: envNew || undefined,
      indexChild: i,
      indexDescendant: virtualIndexNew,
      isCursor,
      isEmpty,
      isInSortedContext,
      isTableCol1,
      isTableCol2,
      isTableCol2Child,
      autofocus,
      // In the context view, use filteredChild.id (the context) rather than child.id (the context parent), otherwise duplicate thoughts in the same context will have the same key.
      // For example, a/~m/cat and a/~m/cats need to use the ids of cat/cats rather than m.
      // filteredChild === child in normal view, so it does not matter in that case.
      key: crossContextualKey(contextChainNew, filteredChild.id),
      // must filteredChild.id to work for both normal view and context view
      leaf: !hasChildren(state, filteredChild.id),
      path: childPath,
      prevChild: filteredChildren[i - 1],
      rank: child.rank,
      showContexts: contextViewActive,
      simplePath: contextViewActive ? thoughtToPath(state, child.id) : appendToPathMemo(simplePath, child.id),
      style,
      thoughtId: child.id,
      ...(isTable
        ? { visibleChildrenKeys: getChildren(state, child.id).map(child => crossContextualKey(contextChain, child.id)) }
        : null),
    }

    // RECURSION
    const descendants = linearizeTree(state, {
      basePath: childPath,
      belowCursor,
      contextId: contextViewActive ? filteredChild.id : undefined,
      contextChain: contextChainNew,
      depth: depth + 1,
      env: envNew,
      indexDescendant: virtualIndexNew,
      // merge styleGrandchildren so it gets applied to this child's children
      styleAccum: safeRefMerge(
        styleAccum,
        pick(styleChildren, ACCUM_STYLE_PROPERTIES),
        pick(getStyle(state, grandchildrenAttributeId), ACCUM_STYLE_PROPERTIES),
      ),
      styleFromGrandparent: getStyle(state, grandchildrenAttributeId),
    })

    // In order to mark every thought after the cursor as belowCursor, we need to update belowCursor before the next sibling is processed. Otherwise, the recursive belowCursor will not be propagated up the call stack and will still be undefined on the next uncle.
    if (!belowCursor && descendants[descendants.length - 1]?.belowCursor) {
      belowCursor = true
    }

    // let contextViewThoughts: any = []
    if (contextViewActive) {
      const contextPaths = filteredChildren
        .map(filteredChild => {
          const child = getThoughtById(state, filteredChild.parentId)
          if (!child) return null
          const childPath = thoughtToPath(state, child.id)
          return childPath
        })
        .filter(Boolean)
      // console.log(filteredChildren.map(child => child.parentId))
      // console.log(contextPaths)
      const groups = groupPaths(contextPaths)
      const contextViewThoughts: TreeThought[] = []
      while (Object.keys(groups).length > 0) {
        const cxid = Object.keys(groups)[0] as ThoughtId
        const contextPath = [cxid] as unknown as SimplePath
        contextViewThoughts.push({
          path: contextPath,
          belowCursor: !!belowCursor,
          depth: depth + contextPath.length - 1, // + (contextViewActive ? thoughtToPath(state, child.id).length - 1 : 0),
          env: envNew || undefined,
          indexChild: i,
          indexDescendant: virtualIndexNew,
          isCursor,
          isEmpty,
          isInSortedContext,
          isTableCol1,
          isTableCol2,
          isTableCol2Child,
          autofocus,
          // In the context view, use filteredChild.id (the context) rather than child.id (the context parent), otherwise duplicate thoughts in the same context will have the same key.
          // For example, a/~m/cat and a/~m/cats need to use the ids of cat/cats rather than m.
          // filteredChild === child in normal view, so it does not matter in that case.
          key: crossContextualKey(contextChainNew, cxid),
          // must filteredChild.id to work for both normal view and context view
          leaf: false,
          prevChild: filteredChildren[i - 1],
          rank: child.rank,
          // showContexts: contextViewActive,
          simplePath: contextPath,
          // style,
          thoughtId: cxid,
        })

        // const group = groups[cxid]
        // console.log({ cxid, group })

        delete groups[cxid]
      }

      return contextViewThoughts
    } else {
      return [...accum, node, ...descendants]
    }
  }, [])

  return thoughts
}

export default linearizeTree
