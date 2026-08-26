import { pick } from 'lodash'
import React from 'react'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import State from '../@types/State'
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
import { appendContextStep, appendToPathMemo } from '../util/appendToPath'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import headId from '../util/headId'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import parseLet from '../util/parseLet'
import { isContextStep } from '../util/pathStep'
import safeRefMerge from '../util/safeRefMerge'
import attributeEquals from './attributeEquals'
import parentContextId from './parentContextId'
import parentContextPath from './parentContextPath'

// style properties that accumulate down the hierarchy.
// We need to accmulate positioning like marginLeft so that all descendants' positions are indented with the thought.
const ACCUM_STYLE_PROPERTIES = ['marginLeft', 'paddingLeft']

/** Generates a VirtualThought key that is unique across context views. */
// Include every context-view boundary the path crosses, plus the row's own step. Both are unambiguous now that a
// context step records the Lexeme context it lands on, so the same thought visible in normal view and in a context
// view gets different keys — as do two thoughts of the same Lexeme in one context (a/m~/cat and a/m~/cats).
// Hashing the whole path would work too, but would change the key whenever an ancestor moves, remounting the node and
// breaking the move animation.
const crossContextualKey = (path: Path) => `${path.filter(isContextStep).join('')}|${head(path)}`

/** Recursiveley calculates the tree of visible thoughts, in order, represented as a flat list of thoughts with tree layout information. */
const linearizeTree = (
  state: State,
  {
    // Base path to start the traversal. Defaults to HOME_PATH.
    basePath,
    /** Used to set belowCursor in recursive calls. Once true, all remaining thoughts will have belowCursor: true. See: TreeThought.belowCursor. */
    belowCursor,
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
  if (!isRoot(path) && !state.expanded[hashedPath] && !equalPath(state.expandHoverDownPath, path)) return []

  // Two thoughts are in play at a context-view row such as a/m~/b: the context `b`, which is displayed and whose
  // metaprogramming attributes apply, and the Lexeme context `b/m`, which supplies the children. Outside the context
  // view they are the same thought.
  const thoughtId = parentContextId(state, path)
  const thought = getThoughtById(state, thoughtId)
  const lexemeContextId = headId(path)
  const simplePath = simplifyPath(state, path)
  const contextViewActive = isContextViewActive(state, path)
  const children = contextViewActive
    ? thought
      ? getContextsSortedAndRanked(state, thought.value)
      : []
    : // the Lexeme context rather than the parent context, so a/m~/b renders the children of b/m without repeating the Lexeme
      getChildrenRanked(state, lexemeContextId)
  const filteredChildren = children.filter(childrenFilterPredicate(state, simplePath))

  // short circuit if the context view only has one context and the NoOtherContexts component will be displayed
  if (contextViewActive && filteredChildren.length === 1) return []

  const childrenAttributeId = findDescendant(state, thoughtId, '=children')
  const grandchildrenAttributeId = findDescendant(state, thoughtId, '=grandchildren')
  const styleChildren = getStyle(state, childrenAttributeId)
  const style = safeRefMerge(styleAccum, styleChildren, styleFromGrandparent)

  // =let definitions on this thought are added to the env inherited from ancestors and passed to all descendants.
  // If there are no =let definitions, the inherited env is passed through unchanged to preserve its object reference, otherwise a new reference on every render would defeat the memoization of TreeNode and its descendants.
  const envParsed = parseLet(state, path)
  const envNew = Object.keys(envParsed).length > 0 ? { ...env, ...envParsed } : env

  // 0-based ordinal of each visible non-attribute child, used to number =bullet/Ordered lists without re-sorting siblings in each Bullet.
  // Attributes (e.g. =children when showHiddenThoughts is enabled) occupy a slot in filteredChildren but are skipped in the numbering (-1).
  const childIndexNonAttribute = filteredChildren.reduce<number[]>(
    (accum, child) => [...accum, isAttribute(child.value) ? -1 : accum.filter(index => index >= 0).length],
    [],
  )

  const thoughts = filteredChildren.reduce<TreeThought[]>((accum, filteredChild, i) => {
    // In the context view the row displays the context, i.e. the parent of the Lexeme context: a/m~/b displays b.
    const child = contextViewActive ? getThoughtById(state, filteredChild.parentId) : filteredChild
    // Context thought may still be pending
    if (!child) return accum
    // The step records the Lexeme context (filteredChild), not the context, so that the row is uniquely addressable
    // and the context-view boundary is explicit rather than re-derived from state.
    const childPath = contextViewActive
      ? appendContextStep(path, filteredChild.id)
      : appendToPathMemo(path, filteredChild.id)
    const lastVirtualIndex = accum.length > 0 ? accum[accum.length - 1].indexDescendant : 0
    const virtualIndexNew = indexDescendant + lastVirtualIndex + (depth === 0 && i === 0 ? 0 : 1)

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
      depth,
      env: envNew,
      indexChild: i,
      childIndexNonAttribute: childIndexNonAttribute[i],
      indexDescendant: virtualIndexNew,
      isCursor,
      isEmpty,
      isInSortedContext,
      isTableCol1,
      isTableCol2,
      isTableCol2Child,
      autofocus,
      key: crossContextualKey(childPath),
      // must filteredChild.id to work for both normal view and context view
      leaf: !hasChildren(state, filteredChild.id),
      path: childPath,
      prevChild: filteredChildren[i - 1],
      rank: child.rank,
      showContexts: contextViewActive,
      // the SimplePath of the displayed thought, i.e. the context in the context view. This is what Editable edits and
      // what metaprogramming attributes are read from. Contrast simplifyPath(childPath), the Lexeme context.
      simplePath: parentContextPath(state, childPath),
      style,
      thoughtId: child.id,
      ...(isTable
        ? {
            // The keys of the rows that will actually be rendered under this thought, which are its contexts when the
            // context view is active on it and its children otherwise. They must be built exactly as the recursion
            // builds them, or the col1 width lookup finds nothing.
            visibleChildrenKeys: isContextViewActive(state, childPath)
              ? getContextsSortedAndRanked(state, child.value).map(context =>
                  crossContextualKey(appendContextStep(childPath, context.id)),
                )
              : getChildren(state, filteredChild.id).map(grandchild =>
                  crossContextualKey(appendToPathMemo(childPath, grandchild.id)),
                ),
          }
        : null),
    }

    // RECURSION
    const descendants = linearizeTree(state, {
      basePath: childPath,
      belowCursor,
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

    return [...accum, node, ...descendants]
  }, [])

  return thoughts
}

export default linearizeTree
