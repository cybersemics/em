import { CSSProperties, ReactNode, useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import State from '../@types/State'
import isCursorGreaterThanParent from '../selectors/isCursorGreaterThanParent'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import parentOf from '../util/parentOf'

type ContextAnimation = 'disappearingLowerLeft' | 'disappearingUpperRight' | null

interface TreeNodePositionerProps {
  children: ReactNode
  contextAnimation: ContextAnimation
  thoughtId: string
  isTableCol1: boolean
  style?: CSSProperties
  cursorOverlay?: boolean
  isMounted?: boolean
  x: number
  y: number
  width?: string | number
  fauxCaretNodeProvider?: CSSProperties
  path: Path
}
/**
 * Wrapper component for TreeNode and BulletCursorOverlay that sets x/y coordinates and handles animation from a given TreeNode.
 * Handles sort and swap animations by splitting X and Y transitions for smoother motion and direction control.
 */
const TreeNodePositioner = ({
  children,
  contextAnimation,
  thoughtId,
  isTableCol1,
  style,
  x: _x,
  y: _y,
  width,
  isMounted,
  path,
  cursorOverlay,
}: TreeNodePositionerProps) => {
  const [y, setY] = useState(_y)
  const [x, setX] = useState(_x)

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

  const outerDivStyle: CSSProperties = {
    // Cannot use transform because it creates a new stacking context, which causes later siblings' DropChild to be covered by previous siblings'.
    // Unfortunately left causes layout recalculation, so we may want to hoist DropChild into a parent and manually control the position.
    left: isMounted ? x : _x,
    top: isMounted ? (isSwap ? 'auto' : y) : _y,
    // Table col1 uses its exact width since cannot extend to the right edge of the screen.
    // All other thoughts extend to the right edge of the screen. We cannot use width auto as it causes the text to wrap continuously during the counter-indentation animation, which is jarring. Instead, use a fixed width of the available space so that it changes in a stepped fashion as depth changes and the word wrap will not be animated. Use x instead of depth in order to accommodate ancestor tables.
    // 1em + 10px is an eyeball measurement at font sizes 14 and 18
    // (Maybe the 10px is from .content padding-left?)
    width: isTableCol1 ? width : `calc(100% - ${x}px + 1em + 10px)`,
    ...(cursorOverlay && isTableCol1 ? { textAlign: 'right' } : {}),
    ...style,
  }

  const innerDivStyle = isSwap
    ? {
        top: y,
        left: 0,
      }
    : {}

  return (
    <div
      // The key must be unique to the thought, both in normal view and context view, in case they are both on screen.
      // It should not be based on editable values such as Path, value, rank, etc, otherwise moving the thought would make it appear to be a completely new thought to React.
      aria-label={cursorOverlay ? 'cursor-overlay-tree-node' : 'tree-node'}
      className={css({
        position: 'absolute',
        willChange: isSwap ? 'left' : undefined,
        transition: cursorOverlay
          ? 'left {durations.layoutNodeAnimation} linear,top {durations.layoutNodeAnimation} ease-in-out'
          : isSwap
            ? swapDirection === 'clockwise'
              ? 'left {durations.layoutNodeAnimation} {easings.nodeCurveXLayerClockwise}'
              : 'left {durations.layoutNodeAnimation} {easings.nodeCurveXLayer}'
            : contextAnimation
              ? 'left {durations.disappearingUpperRight} ease-out,top {durations.disappearingUpperRight} ease-out'
              : 'left {durations.layoutNodeAnimation} ease-out,top {durations.layoutNodeAnimation} ease-out',
      })}
      style={outerDivStyle}
      data-thought-id={thoughtId}
      data-path={hashPath(path)}
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
          willChange: isSwap ? 'top' : undefined,
          transition: isSwap
            ? swapDirection === 'clockwise'
              ? 'top {durations.layoutNodeAnimation} {easings.nodeCurveYLayerClockwise}'
              : 'top {durations.layoutNodeAnimation} {easings.nodeCurveYLayer}'
            : undefined,
        })}
        style={innerDivStyle}
      >
        {children}
      </div>
    </div>
  )
}
export default TreeNodePositioner
