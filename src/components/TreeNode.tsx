import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransitionProps } from 'react-transition-group/CSSTransition'
import { css } from '../../styled-system/css'
import ActionType from '../@types/ActionType'
import State from '../@types/State'
import TreeThoughtPositioned from '../@types/TreeThoughtPositioned'
import durations from '../durations.config'
import testFlags from '../e2e/testFlags'
import useFauxCaretNodeProvider from '../hooks/useFauxCaretCssVars'
import useMoveThoughtAnimation from '../hooks/useMoveThoughtAnimation'
import usePrevious from '../hooks/usePrevious'
import isContextViewActive from '../selectors/isContextViewActive'
import isCursorGreaterThanParent from '../selectors/isCursorGreaterThanParent'
import equalPath from '../util/equalPath'
import isDescendantPath from '../util/isDescendantPath'
import parentOf from '../util/parentOf'
import DropCliff from './DropCliff'
import FadeTransition from './FadeTransition'
import FauxCaret from './FauxCaret'
import VirtualThought, { SetSize } from './VirtualThought'

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
  setSize: SetSize
  cliffPaddingStyle: { paddingBottom: number }
  dragInProgress: boolean
  autofocusDepth: number
  editing: boolean
} & Pick<CSSTransitionProps, 'in'>) => {
  const [y, setY] = useState(_y)
  const [x, setX] = useState(_x)
  const [isSortAnimating, setIsSortAnimating] = useState(false)
  // Since the thoughts slide up & down, the faux caret needs to be a child of the TreeNode
  // rather than one universal caret in the parent.
  const fadeThoughtRef = useRef<HTMLDivElement>(null)
  // Store the on-screen index from the previous render to determine movement direction.
  const previousIndex = usePrevious<number>(index)

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

  /** The transition animation for descendants of the context view after toggleContextView. Returns null otherwise. */
  const contextAnimation: 'disappearingLowerLeft' | 'disappearingUpperRight' | null = useSelector(state => {
    const isLastActionContextView = state.undoPatches[state.undoPatches.length - 1]?.some(
      patch => patch.actions[0] === 'toggleContextView',
    )
    if (!isLastActionContextView) return null

    // Determine the animation direction for disappearing text
    let animation: 'disappearingLowerLeft' | 'disappearingUpperRight' = 'disappearingLowerLeft'

    if (isDescendantPath(path, state.cursor)) {
      const isAppearing = transitionGroupsProps.in
      const isCursorInContextView = isLastActionContextView
        ? !!state.cursor && isContextViewActive(state, state.cursor)
        : false
      if (isCursorInContextView) {
        // Context View ON
        // New contextual child appearing (fade IN from RIGHT)
        // Old original child disappearing (fade OUT to LEFT)
        animation = isAppearing ? 'disappearingUpperRight' : 'disappearingLowerLeft'
      } else {
        // Context View OFF
        // Original child re-appearing (fade IN from LEFT)
        // Contextual child disappearing (fade OUT to RIGHT)
        animation = isAppearing ? 'disappearingLowerLeft' : 'disappearingUpperRight'
      }
    }

    return animation
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

  /** Detect when this thought's on-screen position (array index) has changed. */
  const indexChanged = previousIndex !== undefined && previousIndex !== index

  /** True if the last action is setSortPreference. */
  const isLastActionSort = useSelector(state => {
    const sortActions: ActionType[] = ['setSortPreference', 'toggleSort']
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    return lastPatches?.some(patch => sortActions.includes(patch.actions[0]))
  })

  /**
   * The direction of the curved animation in sort operations.
   * - If the thought's rank increased (moved down), curve right (clockwise).
   * - If the thought's rank decreased (moved up), curve left (counterclockwise).
   */
  const sortDirection = useMemo(
    () => (isLastActionSort && previousIndex !== undefined && index > previousIndex ? 'clockwise' : 'counterclockwise'),
    // Only recalculate sortDirection when index changes and  last action is sort.
    // Do not update when previousIndex changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, isLastActionSort],
  )

  const moveDivStyle = useMoveThoughtAnimation(index)

  /**
   * Horizontal offset for the first frame of a sort animation. This allows the X transition
   * to start immediately from the correct position.
   */
  const sortOffset = sortDirection === 'clockwise' ? 30 : -30

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
    // Start sort animation only when the change originated from a sort action.
    if (isLastActionSort && indexChanged) {
      setIsSortAnimating(true)
    }

    // After the layout node animation duration:
    // reset X offset (Y will update naturally when isSortAnimating becomes false)
    const timer = setTimeout(() => {
      setIsSortAnimating(false)
      // manual timeout adjustment to get the transition duration effectively applied
    }, 0.5 * durations.layoutNodeAnimation)

    return () => clearTimeout(timer)
  }, [isLastActionSort, indexChanged])

  // List Virtualization
  // Do not render thoughts that are below the viewport.
  // Exception: The cursor thought and its previous siblings may temporarily be out of the viewport, such as if when New Subthought is activated on a long context. In this case, the new thought will be created below the viewport and needs to be rendered in order for scrollCursorIntoView to be activated.
  // Render virtualized thoughts with their estimated height so that document height is relatively stable.
  // Perform this check here instead of in virtualThoughtsPositioned since it changes with the scroll position (though currently `sizes` will change as new thoughts are rendered, causing virtualThoughtsPositioned to re-render anyway).
  if (belowCursor && !isCursor && y > viewportBottom + height) {
    return null
  }

  const outerDivStyle = {
    // Cannot use transform because it creates a new stacking context, which causes later siblings' DropChild to be covered by previous siblings'.
    // Unfortunately left causes layout recalculation, so we may want to hoist DropChild into a parent and manually control the position.
    left: isLastActionSort ? x + (isSortAnimating ? sortOffset : 0) : x,
    top: isSwap || isLastActionSort ? 'auto' : y,
    // Table col1 uses its exact width since cannot extend to the right edge of the screen.
    // All other thoughts extend to the right edge of the screen. We cannot use width auto as it causes the text to wrap continuously during the counter-indentation animation, which is jarring. Instead, use a fixed width of the available space so that it changes in a stepped fashion as depth changes and the word wrap will not be animated. Use x instead of depth in order to accommodate ancestor tables.
    // 1em + 10px is an eyeball measurement at font sizes 14 and 18
    // (Maybe the 10px is from .content padding-left?)
    width: isTableCol1 ? width : `calc(100% - ${x}px + 1em + 10px)`,
    ...(style || {}),
    ...fauxCaretNodeProvider,
  }

  const innerDivStyle =
    isSwap || isLastActionSort
      ? {
          top: y,
          left: 0,
        }
      : moveDivStyle

  return (
    <FadeTransition
      id={thoughtKey}
      // The FadeTransition is only responsible for fade in on new thought and fade out on unmount. See autofocusChanged for autofocus opacity transition during navigation.
      // Archive, delete, and uncategorize get a special dissolve animation.
      // Context view children get special disappearing text animations
      type={isEmpty ? 'nodeFadeIn' : isLastActionDelete ? 'nodeDissolve' : (contextAnimation ?? 'nodeFadeOut')}
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
            : isLastActionSort
              ? 'left {durations.layoutNodeAnimation} {easings.nodeCurveSortXLayer}'
              : contextAnimation
                ? 'left {durations.disappearingUpperRight} ease-out,top {durations.disappearingUpperRight} ease-out'
                : 'left {durations.layoutNodeAnimation} ease-out,top {durations.layoutNodeAnimation} ease-out',
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
              : isLastActionSort
                ? 'top {durations.layoutNodeAnimation} {easings.nodeCurveSortYLayer}'
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
              onResize={props => setSize({ ...props, cliff })}
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
              cliff={cliff}
              prevCliff={treeThoughtsPositioned[index - 1]?.cliff}
              isLastVisible={isLastVisible}
              autofocus={autofocus}
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
