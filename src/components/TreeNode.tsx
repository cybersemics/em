import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { CSSTransitionProps } from 'react-transition-group/CSSTransition'
import { css } from '../../styled-system/css'
import ActionType from '../@types/ActionType'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import TreeThoughtPositioned from '../@types/TreeThoughtPositioned'
import testFlags from '../e2e/testFlags'
import useFauxCaretNodeProvider from '../hooks/useFauxCaretCssVars'
import attributeEquals from '../selectors/attributeEquals'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import isCursorGreaterThanParent from '../selectors/isCursorGreaterThanParent'
import rootedParentOf from '../selectors/rootedParentOf'
import durations from '../util/durations'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'
import DropCliff from './DropCliff'
import FadeTransition from './FadeTransition'
import FauxCaret from './FauxCaret'
import VirtualThought, { OnResize } from './VirtualThought'

/** Returns the width of a given text string using the specified font. */
const getTextWidth = (text: string, font: string): number => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return 0
  context.font = font
  return context.measureText(text).width
}

/** Custom hook to fetch thought IDs that affect the max width. */
const useWidthDependentThoughtIds = (path: Path): ThoughtId[] => {
  return useSelector((state: State) => {
    const parentPath = rootedParentOf(state, path)
    const parentId = head(parentPath)
    const grandParentPath = parentId ? rootedParentOf(state, parentPath) : null
    const grandParentId = grandParentPath ? head(grandParentPath) : null
    const children = parentId ? getAllChildrenAsThoughts(state, parentId) : []
    const childrenWithoutDividers = children.filter(child => !isDivider(child.value))
    const isOnlyChild = childrenWithoutDividers.length === 0
    const isTableView =
      attributeEquals(state, parentId, '=view', 'Table') || attributeEquals(state, grandParentId, '=view', 'Table')

    const dependentThoughtIds = isOnlyChild
      ? isTableView && grandParentId
        ? // If the thought is the only child and in a table view, get the grandchildren's IDs
          getAllChildrenAsThoughts(state, grandParentId)
            .filter(child => !isDivider(child.value))
            .flatMap(parent =>
              (parent.id ? getAllChildrenAsThoughts(state, parent.id) : [])
                .filter(child => !isDivider(child.value))
                .map(child => child.id),
            )
        : // If the thought is the only child but not in a table view, return an empty array
          []
      : // If the thought is not the only child, get the sibling thought IDs
        childrenWithoutDividers.map(child => child.id)

    return dependentThoughtIds
  }, shallowEqual)
}

/** Calculates the width of multiple thoughts by measuring their rendered widths in the DOM. */
const getThoughtWidths = (ids: ThoughtId[]): number[] => {
  return ids.map(id => {
    const editable = document.querySelector(`[aria-label="editable-${id}"]`) as HTMLElement | null
    if (editable) {
      const text = editable?.innerText
      const computedStyle = window.getComputedStyle(editable)
      const font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`
      const editableWidth = getTextWidth(text, font)
      return editableWidth
    }
    return 0
  })
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
  x: _x,
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
  editing,
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
  editing: boolean
} & Pick<CSSTransitionProps, 'in'>) => {
  const [y, setY] = useState(_y)
  const [x, setX] = useState(_x)
  // Since the thoughts slide up & down, the faux caret needs to be a child of the TreeNode
  // rather than one universal caret in the parent.
  const fadeThoughtRef = useRef<HTMLDivElement>(null)

  const duration = durations.get('layoutNodeAnimation')

  const hasMounted = useRef(false)
  const prevIsTableCol1 = useRef(isTableCol1)
  const widthDependentThoughtIds = useWidthDependentThoughtIds(path)

  /** Calculates the horizontal translation needed to align the text to the right within its parent. */
  const calculateTranslateX = (): number => {
    const element = fadeThoughtRef.current
    if (!element) return 0

    const editable = element.querySelector('.editable') as HTMLElement | null
    if (!editable) return 0

    const text = editable.innerText
    const computedStyle = window.getComputedStyle(editable)
    const font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`
    const editableWidth = getTextWidth(text, font)

    const widths = getThoughtWidths(widthDependentThoughtIds)
    const maxSiblingWidth = Math.max(...widths, 0)

    return maxSiblingWidth - editableWidth
  }

  const fauxCaretNodeProvider = useFauxCaretNodeProvider({
    editing,
    fadeThoughtElement: fadeThoughtRef.current,
    isCursor,
    isTableCol1,
    path,
  })

  // true if the last action is any of archive/delete/collapse
  const isLastActionDelete = useSelector(state => {
    const deleteActions: ActionType[] = ['archiveThought', 'uncategorize', 'deleteThought', 'deleteThoughtWithCursor']
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    return lastPatches?.some(patch => deleteActions.includes(patch.actions[0]))
  })

  /** True if the last action is swapParent and the thought is involved in the swap (cursor or parent). */
  const isSwap = useSelector(
    state =>
      state.lastUndoableActionType === 'swapParent' &&
      // path is involved in the swap if it is the cursor or the parent of the cursor
      (equalPath(state.cursor, path) || equalPath(parentOf(state.cursor!), path)),
  )

  /** The direction of the curved animation in swapParent. If the child (cursor) thought value is greater than the parent thought value, rotate clockwise, otherwise rotate counterclockwise. This ensures that the parent and child curve in opposite directions, and activating swapParent twice will appear as a reversal instead of another rotation in the same direction. Returns null if the last action is not swapParent. */
  const swapDirection = useSelector((state: State): 'clockwise' | 'counterclockwise' | null =>
    !isSwap ? null : isCursorGreaterThanParent(state) ? 'clockwise' : 'counterclockwise',
  )

  // We split x and y transitions into separate nodes to:
  // 1. Allow independent timing curves for horizontal and vertical movement
  // 2. Create L-shaped animation paths by controlling when each movement starts/ends
  // 3. Prevent interference between transitions that could occur in a single node

  useLayoutEffect(() => {
    // Track x position changes. When x prop changes, update state to trigger CSS transition.
    // State updates ensure smooth transitions by forcing a re-render that applies the new position.
    setX(_x)
  }, [_x])

  useLayoutEffect(() => {
    // When y changes React re-renders the component with the new value of y. It will result in a visual change in the DOM.
    // Because this is a state-driven change, React applies the updated value to the DOM, which causes the browser to recognize that
    // a CSS property has changed, thereby triggering the CSS transition.
    // Without this additional render, updates get batched and subsequent CSS transitions may not work properly. For example, when moving a thought down, it would not animate.
    setY(_y)
  }, [_y])

  useLayoutEffect(() => {
    if (dragInProgress) return
    
    const element = fadeThoughtRef.current
    if (!element) return

    if (!hasMounted.current) {
      hasMounted.current = true
      prevIsTableCol1.current = isTableCol1
      return
    }

    // If we've already run once and the column flag didn't change, skip animation.
    if (hasMounted.current && prevIsTableCol1.current === isTableCol1) {
      return
    }

    // Mark that the effect has now run at least once.
    hasMounted.current = true

    // Grab the bullet and editable elements.
    const bulletEl = element.querySelector('[aria-label="bullet"]') as HTMLElement
    const editableEl = element.querySelector('.editable') as HTMLElement

    // Compute the slide offset and fine-tune bullet offsets.
    const offset = calculateTranslateX()
    const bulletEnterOffset = -7
    const bulletExitOffset = 7

    // 1) Place both elements in their “pre-animation” positions with no transition.
    if (bulletEl) bulletEl.style.transition = 'none'
    editableEl.style.transition = 'none'

    if (isTableCol1) {
      // Entering column 1: shift both left.
      if (bulletEl) bulletEl.style.transform = `translateX(${bulletEnterOffset}px)`
      editableEl.style.transform = `translateX(-${offset}px)`
    } else {
      // Exiting column 1: shift both right.
      if (bulletEl) bulletEl.style.transform = `translateX(${bulletExitOffset}px)`
      editableEl.style.transform = `translateX(${offset}px)`
    }

    // 2) On the next frame, restore transitions and animate back to zero.
    requestAnimationFrame(() => {
      const t = `transform ${duration}ms ease-out`
      if (bulletEl) bulletEl.style.transition = t
      editableEl.style.transition = t

      if (bulletEl) bulletEl.style.transform = 'translateX(0)'
      editableEl.style.transform = 'translateX(0)'
    })

    // 3) Remember the current column state for the next run.
    prevIsTableCol1.current = isTableCol1

    // We intentionally omit `calculateTranslateX` and `duration` from deps
    // so this effect only fires when `isTableCol1` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTableCol1])

  const vtStyle = useMemo<React.CSSProperties>(() => {
    // Add a bit of space after a cliff to give nested lists some breathing room.
    // Do this as padding instead of y, otherwise there will be a gap between drop targets.
    // In Table View, we need to set the cliff padding on col1 so it matches col2 padding, otherwise there will be a gap during drag-and-drop.
    const style: React.CSSProperties = cliff < 0 || isTableCol1 ? { ...cliffPaddingStyle } : {}

    // only add textAlign when in col1
    if (isTableCol1) {
      style.textAlign = 'right'
    }

    return style
  }, [cliff, cliffPaddingStyle, isTableCol1])

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

  const outerDivStyle = {
    // Cannot use transform because it creates a new stacking context, which causes later siblings' DropChild to be covered by previous siblings'.
    // Unfortunately left causes layout recalculation, so we may want to hoist DropChild into a parent and manually control the position.
    left: x,
    top: isSwap ? 'auto' : y,
    // Table col1 uses its exact width since cannot extend to the right edge of the screen.
    // All other thoughts extend to the right edge of the screen. We cannot use width auto as it causes the text to wrap continuously during the counter-indentation animation, which is jarring. Instead, use a fixed width of the available space so that it changes in a stepped fashion as depth changes and the word wrap will not be animated. Use x instead of depth in order to accommodate ancestor tables.
    // 1em + 10px is an eyeball measurement at font sizes 14 and 18
    // (Maybe the 10px is from .content padding-left?)
    width: isTableCol1 ? width : `calc(100% - ${x}px + 1em + 10px)`,
    ...(style || {}),
    ...fauxCaretNodeProvider,
  }

  const innerDivStyle = isSwap
    ? {
        top: y,
        left: 0,
      }
    : undefined

  return (
    <FadeTransition
      id={thoughtKey}
      // The FadeTransition is only responsible for fade in on new thought and fade out on unmount. See autofocusChanged for autofocus opacity transition during navigation.
      // Archive, delete, and uncategorize get a special dissolve animation.
      duration={isEmpty ? 'nodeFadeIn' : isLastActionDelete ? 'nodeDissolve' : 'nodeFadeOut'}
      nodeRef={fadeThoughtRef}
      in={transitionGroupsProps.in}
      unmountOnExit
    >
      <div
        // The key must be unique to the thought, both in normal view and context view, in case they are both on screen.
        // It should not be based on editable values such as Path, value, rank, etc, otherwise moving the thought would make it appear to be a completely new thought to React.
        aria-label='tree-node'
        className={css({
          position: 'absolute',

          transition: isSwap
            ? swapDirection === 'clockwise'
              ? 'left {durations.layoutNodeAnimation} {easings.nodeCurveXLayerClockwise}'
              : 'left {durations.layoutNodeAnimation} {easings.nodeCurveXLayer}'
            : 'left {durations.layoutNodeAnimation} ease-out,top {durations.layoutNodeAnimation} ease-out, margin-right {durations.layoutNodeAnimation} ease-out',
        })}
        style={outerDivStyle}
      >
        <div
          className={css({
            ...(isTableCol1
              ? {
                  position: 'relative',
                  width: 'auto',
                }
              : {
                  position: 'absolute',
                  width: '100%',
                }),
            transition: isSwap
              ? swapDirection === 'clockwise'
                ? 'top {durations.layoutNodeAnimation} {easings.nodeCurveYLayerClockwise}'
                : 'top {durations.layoutNodeAnimation} {easings.nodeCurveYLayer}'
              : undefined,
          })}
          style={innerDivStyle}
        >
          <div ref={fadeThoughtRef}>
            <VirtualThought
              debugIndex={testFlags.simulateDrop ? indexChild : undefined}
              depth={depth}
              dropUncle={thoughtId === cursorUncleId}
              env={env}
              indexDescendant={indexDescendant}
              isMultiColumnTable={false}
              leaf={leaf}
              onResize={setSize}
              path={path}
              prevChildId={prevChild?.id}
              showContexts={showContexts}
              simplePath={simplePath}
              singleLineHeight={singleLineHeightWithCliff}
              style={vtStyle}
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
          <span className={css({ position: 'absolute', margin: '-0.1875em 0 0 -0.05em', top: 0, left: 0 })}>
            <FauxCaret caretType='positioned' path={path} wrapperElement={fadeThoughtRef.current} />
          </span>
        </div>
      </div>
    </FadeTransition>
  )
}

export default TreeNode
