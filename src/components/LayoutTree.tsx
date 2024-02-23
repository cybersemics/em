import _ from 'lodash'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Index from '../@types/IndexType'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { isTouch } from '../browser'
import { HOME_PATH, LAYOUT_NODE_ANIMATION_DURATION } from '../constants'
import globals from '../globals'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import getChildren, { childrenFilterPredicate, getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import viewportStore from '../stores/viewport'
import { appendToPathMemo } from '../util/appendToPath'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import parseLet from '../util/parseLet'
import safeRefMerge from '../util/safeRefMerge'
import unroot from '../util/unroot'
import DropEnd from './DropEnd'
import VirtualThought from './VirtualThought'

/** 1st Pass: A thought with rendering information after the tree has been linearized. */
type TreeThought = {
  /** If true, the thought is rendered below the cursor (i.e. with a higher y value). This is used to crop hidden thoughts. */
  belowCursor: boolean
  depth: number
  env?: LazyEnv
  // index among visible siblings at the same level
  indexChild: number
  // index among all visible thoughts in the tree
  indexDescendant: number
  isCursor: boolean
  isTableCol1: boolean
  isTableCol2: boolean
  isTableCol2Child: boolean
  key: string
  leaf: boolean
  path: Path
  prevChild: Thought
  showContexts?: boolean
  simplePath: SimplePath
  // style inherited from parents with =children/=style and grandparents with =grandchildren/=style
  style?: React.CSSProperties | null
  thought: Thought
  // keys of visible children
  // only used in table view to calculate the width of column 1
  visibleChildrenKeys?: string[]
}

/** 2nd Pass: A thought with position information after its height has been measured. */
type TreeThoughtPositioned = TreeThought & {
  cliff: number
  height: number
  singleLineHeightWithCliff: number
  width?: number
  x: number
  y: number
}

/** The padding-bottom of the .content element. Make sure it matches the CSS. */
const CONTENT_PADDING_BOTTOM = 153

// ms to debounce removal of size entries as VirtualThoughts are unmounted
const SIZE_REMOVAL_DEBOUNCE = 1000

// style properties that accumulate down the hierarchy.
// We need to accmulate positioning like marginLeft so that all descendants' positions are indented with the thought.
const ACCUM_STYLE_PROPERTIES = ['marginLeft', 'paddingLeft']

/** Generates a VirtualThought key that is unique across context views. */
// include the head of each context view in the path in the key, otherwise there will be duplicate keys when the same thought is visible in normal view and context view
const crossContextualKey = (contextChain: Path[] | undefined, id: ThoughtId) =>
  `${(contextChain || []).map(head).join('')}|${id}`

/** Dynamically update and remove sizes for different keys. */
const useSizeTracking = () => {
  // Track dynamic thought sizes from inner refs via VirtualThought. These are used to set the absolute y position which enables animation between any two states. isVisible is used to crop hidden thoughts.
  const [sizes, setSizes] = useState<Index<{ height: number; width?: number; isVisible: boolean }>>({})
  const unmounted = useRef(false)

  // Track debounced height removals
  // See: removeSize
  const sizeRemovalTimeouts = useRef<Map<string, number>>(new Map())

  // Removing a size immediately on unmount can cause an infinite mount-unmount loop as the VirtualThought re-render triggers a new height calculation (iOS Safari only).
  // Debouncing size removal mitigates the issue.
  // Use throttleConcat to accumulate all keys to be removed during the interval.
  // TODO: Is a root cause of the mount-unmount loop.
  const removeSize = useCallback((key: string) => {
    clearTimeout(sizeRemovalTimeouts.current.get(key))
    const timeout = setTimeout(() => {
      if (unmounted.current) return
      setSizes(sizesOld => {
        delete sizesOld[key]
        return sizesOld
      })
    }, SIZE_REMOVAL_DEBOUNCE) as unknown as number
    sizeRemovalTimeouts.current.set(key, timeout)
  }, [])

  /** Update the size record of a single thought. Make sure to use a key that is unique across thoughts and context views. This should be called whenever the size of a thought changes to ensure that y positions are updated accordingly and thoughts are animated into place. Otherwise, y positions will be out of sync and thoughts will start to overlap. */
  const setSize = useCallback(
    ({
      height,
      width,
      id,
      isVisible,
      key,
    }: {
      height: number | null
      width?: number | null
      id: ThoughtId
      isVisible: boolean
      key: string
    }) => {
      if (height !== null) {
        // cancel thought removal timeout
        clearTimeout(sizeRemovalTimeouts.current.get(key))
        sizeRemovalTimeouts.current.delete(key)

        setSizes(sizesOld =>
          height === sizesOld[key]?.height && isVisible === sizesOld[key]?.isVisible
            ? sizesOld
            : {
                ...sizesOld,
                [key]: {
                  height,
                  width: width || undefined,
                  isVisible,
                },
              },
        )
      } else {
        removeSize(key)
      }
    },
    [removeSize],
  )

  useEffect(() => {
    return () => {
      unmounted.current = true
    }
  }, [])

  return useMemo(
    () => ({
      sizes,
      setSize,
    }),
    [sizes, setSize],
  )
}

/** Measure the total height of the .nav and .footer elements on render. Always triggers a second render (which is nonconsequential since useSizeTracking already entails additional renders as heights are rendered). */
const useNavAndFooterHeight = () => {
  // Get the nav and footer heights for the spaceBelow calculation.
  // Nav hight changes when the breadcrumbs wrap onto multiple lines.
  // Footer height changes on font size change.
  const [navAndFooterHeight, setNavAndFooterHeight] = useState(0)

  // Read the footer and nav heights on render and set the refs so that the spaceBelow calculation is updated on the next render.
  // This works because there is always a second render due to useSizeTracking.
  // No risk of infinite render since the effect cannot change the height of the nav or footer.
  // nav/footer height -> effect -> setNavAndFooterHeight -> render -> effect -> setNavAndFooterHeight (same values)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    _.throttle(() => {
      const navEl = document.querySelector('.nav')
      const footerEl = document.querySelector('.footer')
      setNavAndFooterHeight(
        (navEl?.getBoundingClientRect().height || 0) + (footerEl?.getBoundingClientRect().height || 0),
      )
    }, 16.666),
  )

  return navAndFooterHeight
}

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
    ? getContextsSortedAndRanked(state, thought.value)
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
    if (!child) return []
    const childPath = appendToPathMemo(path, child.id)
    const lastVirtualIndex = accum.length > 0 ? accum[accum.length - 1].indexDescendant : 0
    const virtualIndexNew = indexDescendant + lastVirtualIndex + (depth === 0 && i === 0 ? 0 : 1)
    const envParsed = parseLet(state, path)
    const envNew =
      env && Object.keys(env).length > 0 && Object.keys(envParsed).length > 0 ? { ...env, ...envParsed } : undefined

    // As soon as the cursor is found, set belowCursor to true. It will be propagated to every subsequent thought.
    // See: TreeThought.belowCursor
    const isCursor = !belowCursor && equalPath(childPath, state.cursor)
    if (isCursor) {
      belowCursor = true
    }

    const isTable = attributeEquals(state, child.id, '=view', 'Table')
    const isTableCol1 = attributeEquals(state, head(simplePath), '=view', 'Table')
    const isTableCol2 = attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table')
    const isTableCol2Child = attributeEquals(state, head(rootedParentOf(state, parentOf(simplePath))), '=view', 'Table')

    const node: TreeThought = {
      belowCursor: !!belowCursor,
      depth,
      env: envNew || undefined,
      indexChild: i,
      indexDescendant: virtualIndexNew,
      isCursor,
      isTableCol1,
      isTableCol2,
      isTableCol2Child,
      // In the context view, use filteredChild.id (the context) rather than child.id (the context parent), otherwise duplicate thoughts in the same context will have the same key.
      // For example, a/~m/cat and a/~m/cats need to use the ids of cat/cats rather than m.
      // filteredChild === child in normal view, so it does not matter in that case.
      key: crossContextualKey(contextChainNew, filteredChild.id),
      // must filteredChild.id to work for both normal view and context view
      leaf: !hasChildren(state, filteredChild.id),
      path: childPath,
      prevChild: filteredChildren[i - 1],
      showContexts: contextViewActive,
      simplePath: contextViewActive ? thoughtToPath(state, child.id) : appendToPathMemo(simplePath, child.id),
      style,
      thought: child,
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
        _.pick(styleChildren, ACCUM_STYLE_PROPERTIES),
        _.pick(getStyle(state, grandchildrenAttributeId), ACCUM_STYLE_PROPERTIES),
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

/** Lays out thoughts as DOM siblings with manual x,y positioning. */
const LayoutTree = () => {
  const { sizes, setSize } = useSizeTracking()
  const treeThoughts = useSelector(linearizeTree, _.isEqual)
  const fontSize = useSelector(state => state.fontSize)
  const dragInProgress = useSelector(state => state.dragInProgress)
  const indentDepth = useSelector(state =>
    state.cursor && state.cursor.length > 2
      ? // when the cursor is on a leaf, the indention level should not change
        state.cursor.length - (hasChildren(state, head(state.cursor)) ? 2 : 3)
      : 0,
  )

  // singleLineHeight is the measured height of a single line thought.
  // If no sizes have been measured yet, use the estimated height.
  // Cache the last measured value in a ref in case sizes no longer contains any single line thoughts.
  // Then do not update it again.
  const singleLineHeightPrev = useRef<number | null>(null)
  const singleLineHeight = useMemo(() => {
    // The estimatedHeight calculation is ostensibly related to the font size, line height, and padding, though the process of determination was guess-and-check. This formula appears to work across font sizes.
    // If estimatedHeight is off, then totalHeight will fluctuate as actual sizes are saved (due to estimatedHeight differing from the actual single-line height).
    const estimatedHeight = fontSize * 2 - 2

    const singleLineHeightMeasured = Object.values(sizes).find(
      // TODO: This does not differentiate between leaves, non-leaves, cliff thoughts, which all have different sizes.
      ({ height }) => Math.abs(height - estimatedHeight) < height / 2,
    )?.height
    if (singleLineHeightMeasured) {
      singleLineHeightPrev.current = singleLineHeightMeasured
    }
    return singleLineHeightPrev.current || estimatedHeight
  }, [fontSize, sizes])

  // cursor depth, taking into account that a leaf cursor has the same autofocus depth as its parent
  const autofocusDepth = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if ((!state.dragInProgress && !globals.simulateDrag && !globals.simulateDrop) || !state.cursor) return 0
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    return state.cursor.length + (isCursorLeaf ? -1 : 0)
  })

  // first uncle of the cursor used for DropBefore
  const cursorUncleId = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if ((!state.dragInProgress && !globals.simulateDrag && !globals.simulateDrop) || !state.cursor) return null
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    const cursorParentId = state.cursor[state.cursor.length - (isCursorLeaf ? 3 : 2)] as ThoughtId | null
    return (cursorParentId && nextSibling(state, cursorParentId)?.id) || null
  })

  const viewportHeight = viewportStore.useSelector(viewport => viewport.innerHeight)

  const {
    // the total amount of space above the first visible thought that will be cropped
    spaceAbove,

    // Sum all the sizes to get the total height of the containing div.
    // Use estimated single-line height for the thoughts that do not have sizes yet.
    // Exclude hidden thoughts below the cursor to reduce empty scroll space.
    totalHeight,
  } = treeThoughts.reduce(
    (accum, node) => {
      const heightNext =
        node.key in sizes
          ? sizes[node.key].isVisible || !node.belowCursor
            ? sizes[node.key].height
            : 0
          : singleLineHeight
      return {
        totalHeight: accum.totalHeight + heightNext,
        spaceAbove:
          accum.spaceAbove + (sizes[node.key] && !sizes[node.key].isVisible && !node.belowCursor ? heightNext : 0),
      }
    },
    {
      totalHeight: 0,
      spaceAbove: 0,
    },
  )

  // The bottom of all visible thoughts in a virtualized list where thoughts below the viewport are hidden (relative to document coordinates; changes with scroll position).
  const viewportBottom = viewportStore.useSelector(
    useCallback(
      viewport => {
        // the number of additional thoughts below the bottom of the screen that are rendered
        const overshoot = singleLineHeight * 5
        return viewport.scrollTop + viewport.innerHeight + spaceAbove + overshoot
      },
      [singleLineHeight, spaceAbove],
    ),
  )

  // extend spaceAbove to be at least the height of the viewport so that there is room to scroll up
  const spaceAboveExtended = Math.max(spaceAbove, viewportHeight)

  // memoized style for padding at a cliff
  const cliffPaddingStyle = useMemo(
    () => ({
      paddingBottom: fontSize / 4,
    }),
    [fontSize],
  )

  // Accumulate the y position as we iterate the visible thoughts since the sizes may vary.
  // We need to do this in a second pass since we do not know the height of a thought until it is rendered, and since we need to linearize the tree to get the depth of the next node for calculating the cliff.
  const {
    indentCursorAncestorTables,
    treeThoughtsPositioned,
  }: {
    // the global indent based on the depth of the cursor and how many ancestors are tables
    indentCursorAncestorTables: number
    treeThoughtsPositioned: TreeThoughtPositioned[]
  } = useMemo(() => {
    // y increases monotically, so it is more efficent to accumulate than to calculate each time
    // x varies, so we calculate it each time
    // (it is especially hard to determine how much x is decreased on cliffs when there are any number of tables in between)
    let yaccum = 0
    let indentCursorAncestorTables = 0

    /** A stack of { depth, y } that stores the bottom y value of each col1 ancestor. */
    /* By default, yaccum is not advanced by the height of col1. This is what positions col2 at the same y value as col1. However, if the height of col1 exceeds the height of col2, then the next node needs to be positioned below col1, otherwise it will overlap. This stack stores the minimum y value of the next node (i.e. y + height). Depth is used to detect the next node after all of col1's descendants.

    e.g. The height of Boston with its long note exceeds the height of b, c, and d combined. Therefore, the next node, x, needs to be positioned below Boston.

    - a
      - =view
        - Table
      - Boston
        - =note
          - What to do when the thought extends onto two or three lines or four lines if we keep going
        - b
          - c
            - d

    */
    const ycol1Ancestors: { depth: number; y: number }[] = []

    // cache table column 1 widths so they are only calculated once and then assigned to each thought in the column
    // key thoughtId of thought with =table attribute
    const tableCol1Widths = new Map<ThoughtId, number>()
    const treeThoughtsPositioned = treeThoughts.map((node, i) => {
      const next: TreeThought | undefined = treeThoughts[i + 1]

      // cliff is the number of levels that drop off after the last thought at a given depth. Increase in depth is ignored.
      // This is used to determine how many DropEnd to insert before the next thought (one for each level dropped).
      // TODO: Fix cliff across context view boundary
      const cliff = next ? Math.min(0, next.depth - node.depth) : -node.depth - 1

      // The single line height needs to be increased for thoughts that have a cliff below them.
      // For some reason this is not yielding an exact subpixel match, so the first updateHeight will not short circuit. Performance could be improved if th exact subpixel match could be determined. Still, this is better than not taking into account cliff padding.
      const singleLineHeightWithCliff = singleLineHeight + (cliff < 0 ? fontSize / 4 : 0)
      const height = sizes[node.key]?.height ?? singleLineHeightWithCliff

      // set the width of table col1 to the minimum width of all visible thoughts in the column
      if (node.visibleChildrenKeys) {
        const tableCol1Width = node.visibleChildrenKeys?.reduce(
          (accum, childKey) => Math.max(accum, sizes[childKey]?.width || 0),
          0,
        )
        if (tableCol1Width > 0) {
          tableCol1Widths.set(head(node.path), tableCol1Width)
        }
      }

      // sum ancestor table widths
      // ignore thought and parent since horizontal shift should begin with col 2, and tableCol1Widths is keyed by the thought with =table
      const ancestorTableWidths = node.path.reduce(
        (accum, id, i) => accum + (tableCol1Widths.get(node.path[i - 2]) || 0),
        0,
      )

      // Calculate the cursor ancestor table width when we are on the cursor node.
      // This is used to animate the entire tree to the left as the cursor moves right.
      if (node.isCursor) {
        indentCursorAncestorTables =
          ancestorTableWidths +
          // table col1: shift left by an additional 1 em so that the shift at the next depth does not feel so extreme
          (node.isTableCol1
            ? fontSize
            : // table col2: shift right by the width of table col1 to offset ancestorTableWidths, since col1 is still visible
              // then shift left by 3 em, which is about the most we can do without col1 getting cropped by the left edge of the screen
              node.isTableCol2
              ? -(tableCol1Widths.get(node.path[node.path.length - 3]) || 0) + fontSize * 3
              : // table col2 child: if the child is a leaf, shift right by the width of table col1 again since col1 is still visible
                // otherwise, shift by 3 em since col1 is now hidden, but we don't want too much of a jump
                node.isTableCol2Child
                ? node.leaf
                  ? -(tableCol1Widths.get(node.path[node.path.length - 4]) || 0) + fontSize * 4
                  : -fontSize * 3
                : 0)
      }

      const x =
        // indentation
        fontSize * node.depth +
        // space between table columns
        fontSize * (node.isTableCol1 ? -1.5 : 0) +
        // table col2
        ancestorTableWidths

      // Set yaccum to the bottom of the previous row's col1 if it is higher than col2.
      // See: ycol1Ancestors
      if (ycol1Ancestors[ycol1Ancestors.length - 1]?.depth >= node.depth) {
        const ycol1 = ycol1Ancestors.pop()!
        if (ycol1.y > yaccum) {
          yaccum = ycol1.y
        }
      }

      // capture the y position of the current thought before it is incremented by its own height
      const y = yaccum

      // increase y by the height of the current thought
      if (!node.isTableCol1 || node.leaf) {
        yaccum += height
      }

      // if the current thought is in table col1, push its y and depth onto the stack so that the next node after it can be positioned below it instead of overlapping it
      // See: ycol1Ancestors
      if (node.isTableCol1) {
        ycol1Ancestors.push({ y: yaccum + height, depth: node.depth })
      }

      return {
        ...node,
        cliff,
        height,
        singleLineHeightWithCliff,
        width: tableCol1Widths.get(head(parentOf(node.path))),
        x,
        y,
      }
    })

    return { indentCursorAncestorTables, treeThoughtsPositioned }
  }, [fontSize, sizes, singleLineHeight, treeThoughts])

  const spaceAboveLast = useRef(spaceAboveExtended)

  // The indentDepth multipicand (0.9) causes the horizontal counter-indentation to fall short of the actual indentation, causing a progressive shifting right as the user navigates deeper. This provides an additional cue for the user's depth, which is helpful when autofocus obscures the actual depth, but it must stay small otherwise the thought width becomes too small.
  // The indentCursorAncestorTables multipicand (0.5) is smaller, since animating over by the entire width of column 1 is too abrupt.
  // (The same multiplicand is applied to the vertical translation that crops hidden thoughts above the cursor.)
  const indent = indentDepth * 0.9 + indentCursorAncestorTables / fontSize

  // get the scroll position before the render so it can be preserved
  const scrollY = window.scrollY

  // when spaceAbove changes, scroll by the same amount so that the thoughts appear to stay in the same place
  useEffect(
    () => {
      const spaceAboveDelta = spaceAboveExtended - spaceAboveLast.current
      window.scrollTo({ top: scrollY - spaceAboveDelta })
      spaceAboveLast.current = spaceAboveExtended
    },
    // do not trigger effect on scrollY change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spaceAboveExtended],
  )

  const navAndFooterHeight = useNavAndFooterHeight()

  /** The space added below the last rendered thought and the breadcrumbs/footer. This is calculated such that there is a total of one viewport of height between the last rendered thought and the bottom of the document. This ensures that when the keyboard is closed, the scroll position will not change. If the caret is on a thought at the top edge of the screen when the keyboard is closed, then the document will shrink by the height of the virtual keyboard. The scroll position will only be forced to change if the document height is less than window.scrollY + window.innerHeight. */
  // Subtract singleLineHeight since we can assume that the last rendered thought is within the viewport. (It would be more accurate to use its exact rendered height, but it just means that there may be slightly more space at the bottom, which is not a problem. The scroll position is only forced to change when there is not enough space.)
  const spaceBelow = viewportHeight - navAndFooterHeight - CONTENT_PADDING_BOTTOM - singleLineHeight

  return (
    <div
      style={{
        // add a full viewport height's space above to ensure that there is room to scroll by the same amount as spaceAbove
        transform: `translateY(${-spaceAboveExtended + viewportHeight}px)`,
      }}
    >
      <div
        style={{
          // Set a container height that fits all thoughts.
          // Otherwise scrolling down quickly will bottom out as virtualized thoughts are re-rendered and the document height is built back up.
          height: totalHeight + spaceBelow,
          // Use translateX instead of marginLeft to prevent multiline thoughts from continuously recalculating layout as their width changes during the transition.
          // Instead of using spaceAbove, we use -min(spaceAbove, c) + c, where c is the number of pixels of hidden thoughts above the cursor before cropping kicks in.
          transform: `translateX(${1.5 - indent}em`,
          transition: 'transform 0.75s ease-out',
          // Add a negative marginRight equal to translateX to ensure the thought takes up the full width. Not animated for a more stable visual experience.
          marginRight: `${-indent + (isTouch ? 2 : -1)}em`,
        }}
      >
        {treeThoughtsPositioned.map(
          (
            {
              belowCursor,
              cliff,
              depth,
              env,
              height,
              indexChild,
              indexDescendant,
              isCursor,
              isTableCol1,
              isTableCol2,
              key,
              leaf,
              path,
              prevChild,
              showContexts,
              simplePath,
              singleLineHeightWithCliff,
              style,
              thought,
              width,
              x,
              y,
            },
            i,
          ) => {
            // List Virtualization
            // Do not render thoughts that are below the viewport.
            // Exception: The cursor thought and its previous siblings may temporarily be out of the viewport, such as if when New Subthought is activated on a long context. In this case, the new thought will be created below the viewport and needs to be rendered in order for scrollCursorIntoView to be activated.
            // Render virtualized thoughts with their estimated height so that document height is relatively stable.
            // Perform this check here instead of in virtualThoughtsPositioned since it changes with the scroll position (though currently `sizes` will change as new thoughts are rendered, causing virtualThoughtsPositioned to re-render anyway).
            if (belowCursor && !isCursor && y > viewportBottom + height) return null

            return (
              <div
                aria-label='tree-node'
                // The key must be unique to the thought, both in normal view and context view, in case they are both on screen.
                // It should not be based on editable values such as Path, value, rank, etc, otherwise moving the thought would make it appear to be a completely new thought to React.
                key={key}
                style={{
                  position: 'absolute',
                  // Cannot use transform because it creates a new stacking context, which causes later siblings' DropEmpty to be covered by previous siblings'.
                  // Unfortunately left causes layout recalculation, so we may want to hoist DropEmpty into a parent and manually control the position.
                  left: x,
                  top: y,
                  transition: `left ${LAYOUT_NODE_ANIMATION_DURATION}ms ease-out,top ${LAYOUT_NODE_ANIMATION_DURATION}ms ease-out`,
                  // Table col1 uses its exact width since cannot extend to the right edge of the screen.
                  // All other thoughts extend to the right edge of the screen. We cannot use width auto as it causes the text to wrap continuously during the counter-indentation animation, which is jarring. Instead, use a fixed width of the available space so that it changes in a stepped fashion as depth changes and the word wrap will not be animated. Use x instead of depth in order to accommodate ancestor tables.
                  // 1em + 10px is an eyeball measurement at font sizes 14 and 18
                  // (Maybe the 10px is from .content padding-left?)
                  width: isTableCol1 ? width : `calc(100% - ${x}px + 1em + 10px)`,
                  ...style,
                  textAlign: isTableCol1 ? 'right' : undefined,
                }}
              >
                <VirtualThought
                  debugIndex={globals.simulateDrop ? indexChild : undefined}
                  depth={depth}
                  dropBefore={thought.id === cursorUncleId}
                  env={env}
                  indexDescendant={indexDescendant}
                  // isMultiColumnTable={isMultiColumnTable}
                  isMultiColumnTable={false}
                  leaf={leaf}
                  onResize={setSize}
                  path={path}
                  prevChildId={prevChild?.id}
                  showContexts={showContexts}
                  simplePath={simplePath}
                  singleLineHeight={singleLineHeightWithCliff}
                  // Add a bit of space after a cliff to give nested lists some breathing room.
                  // Do this as padding instead of y, otherwise there will be a gap between drop targets.
                  style={cliff < 0 ? cliffPaddingStyle : undefined}
                  crossContextualKey={key}
                />

                {/* DropEnd (cliff) */}
                {dragInProgress &&
                  cliff < 0 &&
                  // do not render hidden cliffs
                  // rough autofocus estimate
                  autofocusDepth - depth < 2 &&
                  Array(-cliff)
                    .fill(0)
                    .map((x, i) => {
                      const pathEnd = -(cliff + i) < path.length ? (path.slice(0, cliff + i) as Path) : HOME_PATH
                      const simplePathEnd =
                        -(cliff + i) < simplePath.length ? (simplePath.slice(0, cliff + i) as SimplePath) : HOME_PATH
                      const cliffDepth = unroot(pathEnd).length
                      return (
                        <div
                          key={'DropEnd-' + head(pathEnd)}
                          className='z-index-subthoughts-drop-end'
                          style={{
                            position: 'relative',
                            top: '-0.2em',
                            left: `calc(${cliffDepth - depth}em + ${isTouch ? -1 : 1}px)`,
                            transition: 'left 0.15s ease-out',
                          }}
                        >
                          <DropEnd
                            depth={pathEnd.length}
                            indexDescendant={indexDescendant}
                            leaf={false}
                            path={pathEnd}
                            // not used, just provided since DropEnd props shares the ThoughtProps type
                            simplePath={simplePathEnd}
                            // Extend the click area of the drop target when there is nothing below.
                            // The last visible drop-end will always be a dimmed thought at distance 1 (an uncle).
                            // Dimmed thoughts at distance 0 should not be extended, as they are dimmed siblings and sibling descendants that have thoughts below
                            // last={!nextChildId}
                          />
                        </div>
                      )
                    })}
              </div>
            )
          },
        )}
      </div>
    </div>
  )
}

export default LayoutTree
