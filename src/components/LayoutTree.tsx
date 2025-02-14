import _ from 'lodash'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { CSSTransitionProps } from 'react-transition-group/CSSTransition'
import { css, cx } from '../../styled-system/css'
import ActionType from '../@types/ActionType'
import Autofocus from '../@types/Autofocus'
import Index from '../@types/IndexType'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { isSafari, isTouch } from '../browser'
import { HOME_PATH } from '../constants'
import { getBoundingClientRect, isEndOfElementNode } from '../device/selection'
import testFlags from '../e2e/testFlags'
import useSortedContext from '../hooks/useSortedContext'
import attributeEquals from '../selectors/attributeEquals'
import calculateAutofocus from '../selectors/calculateAutofocus'
import findDescendant from '../selectors/findDescendant'
import getChildren, { childrenFilterPredicate, getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import nextSibling from '../selectors/nextSibling'
import rootedGrandparentOf from '../selectors/rootedGrandparentOf'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import editingValueStore from '../stores/editingValue'
import reactMinistore from '../stores/react-ministore'
import scrollTopStore from '../stores/scrollTop'
import viewportStore from '../stores/viewport'
import { appendToPathMemo } from '../util/appendToPath'
import equalPath from '../util/equalPath'
import hideCaret, { getHideCaretAnimationName } from '../util/getHideCaretAnimationName'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import parseLet from '../util/parseLet'
import safeRefMerge from '../util/safeRefMerge'
import DropCliff from './DropCliff'
import FadeTransition from './FadeTransition'
import HoverArrow from './HoverArrow'
import VirtualThought, { OnResize } from './VirtualThought'

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
  isEmpty: boolean
  isInSortedContext: boolean
  isTableCol1: boolean
  isTableCol2: boolean
  isTableCol2Child: boolean
  key: string
  leaf: boolean
  path: Path
  prevChild: Thought
  rank: number
  showContexts?: boolean
  simplePath: SimplePath
  // style inherited from parents with =children/=style and grandparents with =grandchildren/=style
  style?: React.CSSProperties | null
  thoughtId: string
  isLastVisible?: boolean
  autofocus: Autofocus
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

/** A computed store that tracks the bottom of the viewport. Used for list virtualization. Does not include overscroll, i.e. if the user scrolls past the top of the document viewportBottom will not change. */
const viewportBottomStore = reactMinistore.compose(
  (viewport, scrollTop) => Math.max(scrollTop, 0) + viewport.innerHeight,
  [viewportStore, scrollTopStore],
)

/** Generates a VirtualThought key that is unique across context views. */
// include the head of each context view in the path in the key, otherwise there will be duplicate keys when the same thought is visible in normal view and context view
const crossContextualKey = (contextChain: Path[] | undefined, id: ThoughtId) =>
  `${(contextChain || []).map(head).join('')}|${id}`

/** Dynamically update and remove sizes for different keys. */
const useSizeTracking = () => {
  // Track dynamic thought sizes from inner refs via VirtualThought. These are used to set the absolute y position which enables animation between any two states. isVisible is used to crop hidden thoughts.
  const [sizes, setSizes] = useState<Index<{ height: number; width?: number; isVisible: boolean }>>({})
  const fontSize = useSelector(state => state.fontSize)
  const unmounted = useRef(false)

  // Track debounced height removals
  // See: removeSize
  const sizeRemovalTimeouts = useRef(new Map<string, number>())

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
        // To create the correct selection behavior, thoughts must be clipped on the top and bottom. Otherwise the top and bottom 1px cause the caret to move to the beginning or end of the editable. But clipPath creates a gap between thoughts. To eliminate this gap, thoughts are rendered with a slight overlap by subtracting a small amount from each thought's measured height, thus affecting their y positions as they are rendered.
        // See: clipPath in recipes/editable.ts
        const lineHeightOverlap = fontSize / 8
        const heightClipped = height - lineHeightOverlap

        // cancel thought removal timeout
        clearTimeout(sizeRemovalTimeouts.current.get(key))
        sizeRemovalTimeouts.current.delete(key)

        setSizes(sizesOld =>
          heightClipped === sizesOld[key]?.height &&
          width === sizesOld[key]?.width &&
          isVisible === sizesOld[key]?.isVisible
            ? sizesOld
            : {
                ...sizesOld,
                [key]: {
                  height: heightClipped,
                  width: width || undefined,
                  isVisible,
                },
              },
        )
      } else {
        removeSize(key)
      }
    },
    [fontSize, removeSize],
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
  const [navbarHeight, setNavbarHeight] = useState(0)
  const [footerHeight, setFooterHeight] = useState(0)

  // Read the footer and nav heights on render and set the refs so that the spaceBelow calculation is updated on the next render.
  // This works because there is always a second render due to useSizeTracking.
  // No risk of infinite render since the effect cannot change the height of the nav or footer.
  // nav/footer height -> effect -> setNavbarHeight/setFooterHeight -> render -> effect -> setNavbarHeight/setFooterHeight (same values)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    _.throttle(() => {
      const navEl = document.querySelector('[aria-label="nav"]')
      const footerEl = document.querySelector('[aria-label="footer"]')
      setNavbarHeight(navEl?.getBoundingClientRect().height || 0)
      setFooterHeight(footerEl?.getBoundingClientRect().height || 0)
    }, 16.666),
  )

  return {
    navbarHeight,
    footerHeight,
  }
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
      depth,
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

/** Renders a thought component for mapped treeThoughtsPositioned. */
const TreeNode = ({
  belowCursor,
  cliff,
  depth,
  env,
  height,
  indexChild,
  indexDescendant,
  isCursor,
  isEmpty,
  isTableCol1,
  isTableCol2,
  thoughtKey,
  leaf,
  path,
  prevChild,
  showContexts,
  isLastVisible,
  simplePath,
  singleLineHeightWithCliff,
  style,
  thoughtId,
  width,
  autofocus,
  x,
  y: _y,
  index,
  viewportBottom,
  treeThoughtsPositioned,
  bulletWidth,
  cursorUncleId,
  setSize,
  cliffPaddingStyle,
  dragInProgress,
  autofocusDepth,
  ...transitionGroupsProps
}: TreeThoughtPositioned & {
  thoughtKey: string
  index: number
  viewportBottom: number
  treeThoughtsPositioned: TreeThoughtPositioned[]
  bulletWidth: number
  cursorUncleId: string | null
  setSize: OnResize
  cliffPaddingStyle: { paddingBottom: number }
  dragInProgress: boolean
  autofocusDepth: number
} & Pick<CSSTransitionProps, 'in'>) => {
  const [y, setY] = useState(_y)
  // Since the thoughts slide up & down, the faux caret needs to be a child of the TreeNode
  // rather than one universal caret in the parent.
  const caretRef = useRef<HTMLSpanElement | null>(null)
  const editing = useSelector(state => state.editing)
  const fadeThoughtRef = useRef<HTMLDivElement>(null)
  const isLastActionNewThought = useSelector(state => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    return lastPatches?.some(patch => patch.actions[0] === 'newThought')
  })

  // true if the last action is any of archive/delete/collapse
  const isLastActionDelete = useSelector(state => {
    const deleteActions: ActionType[] = [
      'archiveThought',
      'collapseContext',
      'deleteThought',
      'deleteThoughtWithCursor',
    ]
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    return lastPatches?.some(patch => deleteActions.includes(patch.actions[0]))
  })

  const [showLineEndFauxCaret, setShowLineEndFauxCaret] = useState(false)

  // Hide the faux caret when typing occurs.
  editingValueStore.subscribe(() => {
    if (isTouch && isSafari() && caretRef.current) {
      caretRef.current.style.display = 'none'
      setShowLineEndFauxCaret(false)
    }
  })

  // If the thought isCursor and edit mode is on, position the faux cursor at the point where the
  // selection is created.
  useEffect(() => {
    if (isTouch && isSafari() && caretRef.current) {
      if (editing && isCursor) {
        // The selection ranges aren't updated until the end of the frame when the thought is focused.
        setTimeout(() => {
          if (caretRef.current) {
            const offset = fadeThoughtRef.current?.getBoundingClientRect()

            if (offset) {
              const rect = getBoundingClientRect()

              if (rect) {
                const { x, y } = rect

                caretRef.current.style.display = 'inline'
                caretRef.current.style.top = `${y - offset.y}px`
                caretRef.current.style.left = `${x - offset.x}px`
                setShowLineEndFauxCaret(false)
              } else {
                caretRef.current.style.display = 'none'
                setShowLineEndFauxCaret(isEndOfElementNode())
              }
            }
          }
        })
      } else {
        caretRef.current.style.display = 'none'
        setShowLineEndFauxCaret(false)
      }
    }
  }, [editing, isCursor, path])

  useLayoutEffect(() => {
    if (y !== _y) {
      // When y changes React re-renders the component with the new value of y. It will result in a visual change in the DOM.
      // Because this is a state-driven change, React applies the updated value to the DOM, which causes the browser to recognize that
      // a CSS property has changed, thereby triggering the CSS transition.
      // Without this additional render, updates get batched and subsequent CSS transitions may not work properly. For example, when moving a thought down, it would not animate.
      setY(_y)
    }
  }, [y, _y])

  // List Virtualization
  // Do not render thoughts that are below the viewport.
  // Exception: The cursor thought and its previous siblings may temporarily be out of the viewport, such as if when New Subthought is activated on a long context. In this case, the new thought will be created below the viewport and needs to be rendered in order for scrollCursorIntoView to be activated.
  // Render virtualized thoughts with their estimated height so that document height is relatively stable.
  // Perform this check here instead of in virtualThoughtsPositioned since it changes with the scroll position (though currently `sizes` will change as new thoughts are rendered, causing virtualThoughtsPositioned to re-render anyway).
  if (belowCursor && !isCursor && y > viewportBottom + height) return null

  const nextThought = isTableCol1 ? treeThoughtsPositioned[index + 1] : null
  const previousThought = isTableCol1 ? treeThoughtsPositioned[index - 1] : null

  // Adjust col1 width to remove dead zones between col1 and col2, increase the width by the difference between col1 and col2 minus bullet width
  const xCol2 = isTableCol1 ? nextThought?.x || previousThought?.x || 0 : 0
  // Increasing margin-right of thought for filling gaps and moving the thought to the left by adding negative margin from right.
  const marginRight = isTableCol1 ? xCol2 - (width || 0) - x - (bulletWidth || 0) : 0

  // Speed up the tree-node's transition (normally layoutNodeAnimationDuration) by 50% on New (Sub)Thought only.
  const transition = isLastActionNewThought
    ? `left {durations.layoutNodeAnimationFast} ease-out,top {durations.layoutNodeAnimationFast} ease-out`
    : `left {durations.layoutNodeAnimation} ease-out,top {durations.layoutNodeAnimation} ease-out`

  return (
    <FadeTransition
      id={thoughtKey}
      // The FadeTransition is only responsible for fade out on unmount;
      // or for fade in on mounting of a new thought.
      // See autofocusChanged for normal opacity transition.
      // Limit the fade/shrink/blur animation to the archive, delete, and collapseContext actions.
      duration={isEmpty ? 'nodeFadeIn' : isLastActionDelete ? 'nodeDissolve' : 'nodeFadeOut'}
      nodeRef={fadeThoughtRef}
      in={transitionGroupsProps.in}
      unmountOnExit
    >
      <div
        aria-label='tree-node'
        // The key must be unique to the thought, both in normal view and context view, in case they are both on screen.
        // It should not be based on editable values such as Path, value, rank, etc, otherwise moving the thought would make it appear to be a completely new thought to React.
        className={css({
          position: 'absolute',
          transition,
          '--faux-caret-line-end-opacity': showLineEndFauxCaret ? undefined : 0,
        })}
        style={{
          // Cannot use transform because it creates a new stacking context, which causes later siblings' DropChild to be covered by previous siblings'.
          // Unfortunately left causes layout recalculation, so we may want to hoist DropChild into a parent and manually control the position.
          left: x,
          top: y,
          // Table col1 uses its exact width since cannot extend to the right edge of the screen.
          // All other thoughts extend to the right edge of the screen. We cannot use width auto as it causes the text to wrap continuously during the counter-indentation animation, which is jarring. Instead, use a fixed width of the available space so that it changes in a stepped fashion as depth changes and the word wrap will not be animated. Use x instead of depth in order to accommodate ancestor tables.
          // 1em + 10px is an eyeball measurement at font sizes 14 and 18
          // (Maybe the 10px is from .content padding-left?)
          width: isTableCol1 ? width : `calc(100% - ${x}px + 1em + 10px)`,
          ...style,
          textAlign: isTableCol1 ? 'right' : undefined,
        }}
      >
        <div ref={fadeThoughtRef}>
          <VirtualThought
            debugIndex={testFlags.simulateDrop ? indexChild : undefined}
            depth={depth}
            dropUncle={thoughtId === cursorUncleId}
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
            // In Table View, we need to set the cliff padding on col1 so it matches col2 padding, otherwise there will be a gap during drag-and-drop.
            style={cliff < 0 || isTableCol1 ? cliffPaddingStyle : undefined}
            crossContextualKey={thoughtKey}
            prevCliff={treeThoughtsPositioned[index - 1]?.cliff}
            isLastVisible={isLastVisible}
            autofocus={autofocus}
            marginRight={isTableCol1 ? marginRight : 0}
          />
        </div>

        {dragInProgress &&
          // do not render hidden cliffs
          // rough autofocus estimate
          autofocusDepth - depth < 2 && (
            <DropCliff
              cliff={cliff}
              depth={depth}
              path={path}
              isTableCol2={isTableCol2}
              isLastVisible={isLastVisible}
              prevWidth={treeThoughtsPositioned[index - 1]?.width}
            />
          )}
        <span
          className={css({
            color: 'blue',
            display: 'none',
            fontSize: '1.25em',
            margin: '-6px 0 0 -2.5px',
            opacity: 'var(--faux-caret-opacity)',
            position: 'absolute',
            pointerEvents: 'none',
            WebkitTextStroke: '0.625px var(--colors-blue)',
          })}
          ref={caretRef}
        >
          |
        </span>
      </div>
    </FadeTransition>
  )
}

/** Lays out thoughts as DOM siblings with manual x,y positioning. */
const LayoutTree = () => {
  const { sizes, setSize } = useSizeTracking()
  const treeThoughts = useSelector(linearizeTree, _.isEqual)
  const fontSize = useSelector(state => state.fontSize)
  const dragInProgress = useSelector(state => state.dragInProgress)
  const ref = useRef<HTMLDivElement | null>(null)
  const indentDepth = useSelector(state =>
    state.cursor && state.cursor.length > 2
      ? // when the cursor is on a leaf, the indention level should not change
        state.cursor.length - (hasChildren(state, head(state.cursor)) ? 2 : 3)
      : 0,
  )

  /** The value of scrollTop. Only enabled when there is a drag in progress for performance reasons. */
  const scrollTopIfDragging = scrollTopStore.useSelector(scrollTop => (dragInProgress ? scrollTop : null))

  // Width of thought bullet
  const [bulletWidth, setBulletWidth] = useState(0)
  // Height of toolbar element
  const [toolbarHeight, setToolbarHeight] = useState(0)
  // Distance from toolbar to the first visible thought
  const [layoutTop, setLayoutTop] = useState(0)

  // set the bullet width only during drag or when simulateDrop is true
  useLayoutEffect(() => {
    if (dragInProgress || testFlags.simulateDrop) {
      const bullet = ref.current?.querySelector('[aria-label=bullet]')
      if (bullet) setBulletWidth(bullet?.getBoundingClientRect().width)

      const toolbar = document.querySelector('#toolbar')
      if (toolbar) setToolbarHeight(toolbar.getBoundingClientRect().height)

      setLayoutTop(ref.current?.getBoundingClientRect().top ?? 0)
    }
  }, [dragInProgress])

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
    if ((!state.dragInProgress && !testFlags.simulateDrag && !testFlags.simulateDrop) || !state.cursor) return 0
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    return state.cursor.length + (isCursorLeaf ? -1 : 0)
  })

  // first uncle of the cursor used for DropUncle
  const cursorUncleId = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if ((!state.dragInProgress && !testFlags.simulateDrag && !testFlags.simulateDrop) || !state.cursor) return null
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
  const viewportBottom = viewportBottomStore.useSelector(
    useCallback(
      viewportBottomState => {
        // the number of additional thoughts below the bottom of the screen that are rendered
        const overshoot = singleLineHeight * 5
        return viewportBottomState + spaceAbove + overshoot
      },
      [singleLineHeight, spaceAbove],
    ),
  )

  const { footerHeight, navbarHeight } = useNavAndFooterHeight()
  const navAndFooterHeight = navbarHeight + footerHeight

  const maxVisibleY = viewportHeight - (layoutTop + navbarHeight)

  const { isHoveringSorted, newRank } = useSortedContext()

  // extend spaceAbove to be at least the height of the viewport so that there is room to scroll up
  const spaceAboveExtended = Math.max(spaceAbove, viewportHeight)

  // memoize the cliff padding style to avoid passing a fresh object reference as prop to TreeNode and forcing a re-render
  const cliffPadding = fontSize / 4
  const cliffPaddingStyle = useMemo(() => ({ paddingBottom: cliffPadding }), [cliffPadding])

  // Accumulate the y position as we iterate the visible thoughts since the sizes may vary.
  // We need to do this in a second pass since we do not know the height of a thought until it is rendered, and since we need to linearize the tree to get the depth of the next node for calculating the cliff.
  const {
    indentCursorAncestorTables,
    treeThoughtsPositioned,
    hoverArrowVisibility,
  }: {
    // the global indent based on the depth of the cursor and how many ancestors are tables
    indentCursorAncestorTables: number
    treeThoughtsPositioned: TreeThoughtPositioned[]
    hoverArrowVisibility: 'above' | 'below' | null
  } = useMemo(() => {
    // y increases monotically, so it is more efficent to accumulate than to calculate each time
    // x varies, so we calculate it each time
    // (it is especially hard to determine how much x is decreased on cliffs when there are any number of tables in between)
    let yaccum = 0
    let indentCursorAncestorTables = 0

    // Arrow visibility based on the rank of drop target in sorted context.
    let hoverArrowVisibility: 'above' | 'below' | null = null

    // The rank of the first and last thoughts in sorted context.
    let firstThoughtRank = 0
    let lastThoughtRank = 0
    // The rank of the first and last visible thoughts in sorted context.
    let firstVisibleThoughtRank = 0
    let lastVisibleThoughtRank = 0

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
      const prev = treeThoughts[i - 1] as TreeThought | undefined
      const next = treeThoughts[i + 1] as TreeThought | undefined

      // cliff is the number of levels that drop off after the last thought at a given depth. Increase in depth is ignored.
      // This is used to determine how many DropEnd to insert before the next thought (one for each level dropped).
      // TODO: Fix cliff across context view boundary
      const cliff = next ? Math.min(0, next.depth - node.depth) : -node.depth - 1

      // The single line height needs to be increased for thoughts that have a cliff below them.
      // For some reason this is not yielding an exact subpixel match, so the first updateHeight will not short circuit. Performance could be improved if th exact subpixel match could be determined. Still, this is better than not taking into account cliff padding.
      const singleLineHeightWithCliff = singleLineHeight + (cliff < 0 ? cliffPadding : 0)
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
                node.isTableCol2Child && node.leaf
                ? -(tableCol1Widths.get(node.path[node.path.length - 4]) || 0) + fontSize * 4
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

      /* 
        Anticipate cliff change on new thought

        There is a special case for the y position when creating a new thought at the end of a context. The former last thought (what will become the new thought's previous sibling) loses its cliff, e.g. cliff changes from -1 to 0. This causes it to lots its cliffPaddingStyle, and thus its height will decrease slightly. However, when the new thought is rendered, its y position is determined by the previous thought's cached height. The height is only re-measured after the nxet render. This causes the new thought's y position to decrease by the cliff padding over a single frame. It will appear to slide up as it animates into the correct y position (based on the updated previous sibling's measurement).

        Solution: Check if a new thought is being rendered at the cliff, and anticipate the updated y position by subtracting cliffPadding. This does not apply if the previous thought's depth is greater than the new thought's depth, as it will not be losing its cliff. It only applies if the prevous thought is a sibling or parent and is losing its cliff.

        (It may have been better to directly check if the previous thought is losing its cliff, however that would require persisting the last cliff for each thought in a ref. The additional state is less than ideal, but it can be pursued if it is discovered that this simple condition has any false positives/negatives.)

        e.g. `a` will lose its cliff but its height will not be re-measured until after [empty] has been rendered with the wrong y
          - a
          - [empty]
      */
      const isNewCliff = !sizes[node.key] && cliff < 0 && prev && node.depth >= prev.depth

      // Capture the y position of the current thought before it is incremented by its own height for the next thought.
      const y = yaccum - (isNewCliff ? cliffPadding : 0)

      // increase y by the height of the current thought
      if (!node.isTableCol1 || node.leaf) {
        yaccum += height
      }

      // if the current thought is in table col1, push its y and depth onto the stack so that the next node after it can be positioned below it instead of overlapping it
      // See: ycol1Ancestors
      if (node.isTableCol1) {
        ycol1Ancestors.push({ y: yaccum + height, depth: node.depth })
      }

      const isLastVisible =
        (node.autofocus === 'dim' || node.autofocus === 'show') &&
        !(next?.autofocus === 'dim' || next?.autofocus === 'show')

      if (scrollTopIfDragging !== null && node.isInSortedContext) {
        // Get first and last thought ranks in sorted context
        if (!firstThoughtRank) {
          firstThoughtRank = node.rank
        }
        lastThoughtRank = node.rank

        // Check if the current thought is visible
        if (y < maxVisibleY && y > scrollTopIfDragging - toolbarHeight) {
          // Get first and last visible thought ranks in sorted context
          if (!firstVisibleThoughtRank) {
            firstVisibleThoughtRank = node.rank
          }
          lastVisibleThoughtRank = node.rank
        }
      }

      return {
        ...node,
        cliff,
        height,
        singleLineHeightWithCliff,
        width: tableCol1Widths.get(head(parentOf(node.path))),
        isLastVisible,
        x,
        y,
      }
    })

    // Determine hoverArrowVisibility based on newRank and the visible thoughts
    if (isHoveringSorted) {
      if (newRank > lastVisibleThoughtRank && lastVisibleThoughtRank !== lastThoughtRank) {
        hoverArrowVisibility = 'below'
      } else if (newRank < firstVisibleThoughtRank && firstVisibleThoughtRank !== firstThoughtRank) {
        hoverArrowVisibility = 'above'
      } else {
        hoverArrowVisibility = null
      }
    }

    return { indentCursorAncestorTables, treeThoughtsPositioned, hoverArrowVisibility }
  }, [
    cliffPadding,
    fontSize,
    isHoveringSorted,
    maxVisibleY,
    newRank,
    scrollTopIfDragging,
    singleLineHeight,
    sizes,
    toolbarHeight,
    treeThoughts,
  ])

  const spaceAboveLast = useRef(spaceAboveExtended)
  // When the cursor is in a table, all thoughts beneath the table are hidden,
  // so there is no concern about animation name conflicts with subsequent (deeper) thoughts.
  const tableDepth = useSelector(state =>
    state.cursor && attributeEquals(state, head(rootedGrandparentOf(state, state.cursor)), '=view', 'Table') ? 1 : 0,
  )
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

  /** The space added below the last rendered thought and the breadcrumbs/footer. This is calculated such that there is a total of one viewport of height between the last rendered thought and the bottom of the document. This ensures that when the keyboard is closed, the scroll position will not change. If the caret is on a thought at the top edge of the screen when the keyboard is closed, then the document will shrink by the height of the virtual keyboard. The scroll position will only be forced to change if the document height is less than window.scrollY + window.innerHeight. */
  // Subtract singleLineHeight since we can assume that the last rendered thought is within the viewport. (It would be more accurate to use its exact rendered height, but it just means that there may be slightly more space at the bottom, which is not a problem. The scroll position is only forced to change when there is not enough space.)
  const spaceBelow = viewportHeight - navAndFooterHeight - CONTENT_PADDING_BOTTOM - singleLineHeight

  return (
    <div
      // the hideCaret animation must run every time the indent changes on iOS Safari, which necessitates replacing the animation with an identical substitute with a different name
      className={cx(
        css({ '--faux-caret-opacity': '0', marginTop: '0.501em' }),
        hideCaret({
          animation: getHideCaretAnimationName(indentDepth + tableDepth),
        }),
      )}
      style={{
        // add a full viewport height's space above to ensure that there is room to scroll by the same amount as spaceAbove
        transform: `translateY(${-spaceAboveExtended + viewportHeight}px)`,
      }}
      ref={ref}
    >
      <HoverArrow
        // Calculate the position of the arrow relative to the bottom of the container.
        bottom={totalHeight + spaceBelow - viewportHeight + navAndFooterHeight}
        hoverArrowVisibility={hoverArrowVisibility}
      />
      <div
        className={css({ transition: `transform {durations.layoutSlowShift} ease-out` })}
        style={{
          // Set a container height that fits all thoughts.
          // Otherwise scrolling down quickly will bottom out as virtualized thoughts are re-rendered and the document height is built back up.
          height: totalHeight + spaceBelow,
          // Use translateX instead of marginLeft to prevent multiline thoughts from continuously recalculating layout as their width changes during the transition.
          // Instead of using spaceAbove, we use -min(spaceAbove, c) + c, where c is the number of pixels of hidden thoughts above the cursor before cropping kicks in.
          transform: `translateX(${1.5 - indent}em`,
          // Add a negative marginRight equal to translateX to ensure the thought takes up the full width. Not animated for a more stable visual experience.
          marginRight: `${-indent + (isTouch ? 2 : -1)}em`,
        }}
      >
        <TransitionGroup>
          {treeThoughtsPositioned.map((thought, index) => (
            <TreeNode
              {...thought}
              index={index}
              // Pass unique key for the component
              key={thought.key}
              // Pass the thought key as a thoughtKey and not key property as it will conflict with React's key
              thoughtKey={thought.key}
              {...{
                viewportBottom,
                treeThoughtsPositioned,
                bulletWidth,
                cursorUncleId,
                setSize,
                cliffPaddingStyle,
                dragInProgress,
                autofocusDepth,
              }}
            />
          ))}
        </TransitionGroup>
      </div>
    </div>
  )
}

export default LayoutTree
