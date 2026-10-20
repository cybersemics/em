import { pick } from 'lodash'
import moize from 'moize'
import React from 'react'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import TreeThought from '../@types/TreeThought'
import { HOME_PATH, HOME_TOKEN, LongPressState } from '../constants'
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
import hashPath from '../util/hashPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import parseLet from '../util/parseLet'
import publishMode from '../util/publishMode'
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
const linearizeTreeRecursive = (
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
    styleAccum?: React.CSSProperties | null
    styleFromGrandparent?: React.CSSProperties | null
  } = {
    depth: 0,
  },
  traversal = { thoughts: [] as TreeThought[], autofocus: calculateAutofocus(state) },
): TreeThought[] => {
  const { thoughts } = traversal
  const path = basePath || HOME_PATH
  const hashedPath = hashPath(path)
  if (!isRoot(path) && !state.expanded[hashedPath] && !equalPath(state.expandHoverDownPath, path)) return thoughts

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

  // Skip empty lists and context views that display the NoOtherContexts placeholder.
  if (filteredChildren.length === 0 || (contextViewActive && filteredChildren.length === 1)) return thoughts

  const isTableCol1 = attributeEquals(state, head(simplePath), '=view', 'Table')
  const isInSortedContext = attributeEquals(state, head(simplePath), '=sort', 'Alphabetical')
  const isTableCol2 = attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table')
  const isTableCol2Child = attributeEquals(state, head(rootedParentOf(state, parentOf(simplePath))), '=view', 'Table')

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
  let ordinal = 0
  const childIndexNonAttribute = filteredChildren.map(child => (isAttribute(child.value) ? -1 : ordinal++))

  const styleGrandchildren = getStyle(state, grandchildrenAttributeId)
  const styleDescendants = safeRefMerge(
    styleAccum,
    styleChildren && pick(styleChildren, ACCUM_STYLE_PROPERTIES),
    styleGrandchildren && pick(styleGrandchildren, ACCUM_STYLE_PROPERTIES),
  )

  filteredChildren.forEach((filteredChild, i) => {
    // If the context view is active, render the context's parent instead of the context itself.
    // This allows the path to be accumulated correctly across the context view.
    // e.g. a/m~/b should render the children of b/m, not a/m
    const child = contextViewActive ? getThoughtById(state, filteredChild.parentId) : filteredChild
    // Ignore stale context references rather than rendering a missing parent.
    if (!child) return
    const childPath = appendToPathMemo(path, child.id)

    // As soon as the cursor is found, set belowCursor to true. It will be propagated to every subsequent thought.
    // See: TreeThought.belowCursor
    const isCursor = !belowCursor && equalPath(childPath, state.cursor)
    if (isCursor || !state.cursor) {
      belowCursor = true
    }

    const isEmpty = child.value === ''
    const isTable = attributeEquals(state, child.id, '=view', 'Table')
    const autofocus = traversal.autofocus(childPath)

    const node: TreeThought = {
      belowCursor: !!belowCursor,
      depth,
      env: envNew,
      indexChild: i,
      childIndexNonAttribute: childIndexNonAttribute[i],
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
      prevChildId: filteredChildren[i - 1]?.id,
      // Only sorted-context drag arrows consume this coordinate.
      rank:
        state.longPress === LongPressState.DragInProgress && isInSortedContext
          ? (state.thoughts.getPosition(child.id) ?? 0)
          : 0,
      showContexts: contextViewActive,
      simplePath: contextViewActive ? thoughtToPath(state, child.id) : appendToPathMemo(simplePath, child.id),
      style,
      thoughtId: child.id,
      ...(isTable
        ? { visibleChildrenKeys: getChildren(state, child.id).map(child => crossContextualKey(contextChain, child.id)) }
        : null),
    }

    // Append each row once instead of copying descendant lists through every ancestor.
    thoughts.push(node)
    linearizeTreeRecursive(
      state,
      {
        basePath: childPath,
        belowCursor,
        contextId: contextViewActive ? filteredChild.id : undefined,
        contextChain: contextChainNew,
        depth: depth + 1,
        env: envNew,
        // merge styleGrandchildren so it gets applied to this child's children
        styleAccum: styleDescendants,
        styleFromGrandparent: styleGrandchildren,
      },
      traversal,
    )

    // In order to mark every thought after the cursor as belowCursor, we need to update belowCursor before the next sibling is processed. Otherwise, the recursive belowCursor will not be propagated up the call stack and will still be undefined on the next uncle.
    if (!belowCursor && thoughts[thoughts.length - 1]?.belowCursor) {
      belowCursor = true
    }
  })

  return thoughts
}

// Cache only the completed traversal. The live reader can change without changing its identity.
export default moize(
  (state: State, options?: Parameters<typeof linearizeTreeRecursive>[1]) => linearizeTreeRecursive(state, options),
  {
    maxSize: 1,
    profileName: 'linearizeTree',
    transformArgs: ([state, options]) => [
      state.thoughts.getThought,
      // Context membership/order and absolute visibility depend on ordinary text and timestamps too.
      state.rootContext[0] !== HOME_TOKEN || Object.values(state.contextViews).some(Boolean)
        ? state.thoughts.revision
        : state.thoughts.layoutRevision,
      state.thoughtUi,
      state.expanded,
      state.expandHoverDownPath,
      state.expandHoverUpPath,
      state.cursor,
      state.contextViews,
      state.showHiddenThoughts,
      state.rootContext,
      state.absoluteContextTime,
      state.longPress === LongPressState.DragInProgress,
      state.storageCache?.theme,
      publishMode(),
      options,
    ],
  },
)
