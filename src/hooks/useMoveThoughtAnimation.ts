import { throttle } from 'lodash'
import { useLayoutEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import durations from '../durations.config'
import attributeEquals from '../selectors/attributeEquals'
import usePrevious from './usePrevious'

/**
 * Determines the move animation name for a thought based on the previous and current indices and the last move action.
 * Returns:
 * - 'moveThoughtOver' when this thought is the one explicitly moved by the user (appears on top).
 * - 'moveThoughtUnder' when this thought is displaced by another thought moving past it (appears underneath).
 * - null when the movement does not require an animation (e.g. indices unchanged or lastMoveAction is null).
 */
const getMoveAnimation = (
  lastMoveAction: 'moveThoughtUp' | 'moveThoughtDown' | null,
  previousIndex: number | undefined,
  currentIndex: number,
): 'moveThoughtOver' | 'moveThoughtUnder' | null => {
  if (!lastMoveAction || previousIndex === undefined) return null

  // Determine actual movement direction of this node relative to its previous on-screen index.
  const direction: 'up' | 'down' = currentIndex < previousIndex ? 'up' : 'down'

  const isMovingWithCursor =
    (lastMoveAction === 'moveThoughtUp' && direction === 'up') ||
    (lastMoveAction === 'moveThoughtDown' && direction === 'down')

  return isMovingWithCursor ? 'moveThoughtOver' : 'moveThoughtUnder'
}

/**
 * Encapsulates the logic that determines the animation state when a thought is moved
 * up or down via the moveThoughtUp / moveThoughtDown reducers. This hook abstracts all
 * of the Redux selectors and timing needed so that the consuming component (TreeNode)
 * only has to deal with the resulting animation flags.
 */
const useMoveThoughtAnimation = (
  index: number,
):
  | Partial<
      Pick<
        React.CSSProperties,
        | 'transformOrigin'
        | 'animationDuration'
        | 'animationTimingFunction'
        | 'animationFillMode'
        | 'animationName'
        | 'zIndex'
      >
    >
  | undefined => {
  const lastMoveAction = useSelector((state: State) => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]

    // Determine if the last action was a moveThoughtUp or moveThoughtDown.
    const moveAction = lastPatches?.some(patch => ['moveThoughtUp', 'moveThoughtDown'].includes(patch.actions[0]))
      ? (lastPatches[0].actions[0] as 'moveThoughtUp' | 'moveThoughtDown')
      : null

    if (!moveAction) return null

    // Determine if we should skip the animation for cross-context moves inside a Table view.
    //
    // When a thought is moved between different parent contexts (a cross-context move),
    // the moveThought action updates the thought's parentId field.
    // This creates a patch with a path ending in '/parentId'.
    // For example: "thoughts/thoughtIndex/abc123/parentId" indicates that thought abc123
    // is being assigned a new parent.
    //
    // We skip animation in these cases because:
    // - Cross-context moves can cause thoughts to jump between table columns
    // - The standard move animation assumes thoughts stay within the same context
    // - Animating across column boundaries creates jarring visual transitions
    const cursor = state.cursor
    const isTableView = cursor ? cursor.some(id => attributeEquals(state, id, '=view', 'Table')) : false
    const isCrossContext = (lastPatches ?? []).some(patch => patch.path?.endsWith('/parentId'))

    const skipMoveAnimation = isCrossContext && isTableView

    return skipMoveAnimation ? null : moveAction
  })

  // hasMoved detects the first render where an index change occurs after a move action.
  // indexChanged: true when current index differs from previous index
  // !prevIndexChanged: true when the previous render did NOT have an index change
  //
  // Without !prevIndexChanged, the animation would trigger on multiple consecutive
  // renders where indexChanged remains true, causing duplicate/overlapping animations.
  // This ensures we only animate once per actual move operation.
  const previousIndex = usePrevious<number>(index)
  const indexChanged = previousIndex !== undefined && previousIndex !== index
  const prevIndexChanged = usePrevious(indexChanged)
  const hasMoved = !!(lastMoveAction && indexChanged && !prevIndexChanged)

  const [moveAnimation, setMoveAnimation] = useState<'moveThoughtOver' | 'moveThoughtUnder' | null>(null)

  // When a move animation starts, we automatically schedule it to be cleared after
  // the animation duration. Throttling ensures that if multiple moves happen in quick
  // succession (faster than the animation duration), we don't accumulate multiple
  // pending clear operations that could interfere with subsequent animations.
  //
  // leading: false means the clear won't happen immediately - it waits for the full
  // animation duration before clearing, allowing the CSS animation to complete.
  const clearMoveAnimation = useMemo(() => {
    return throttle(() => setMoveAnimation(null), durations.layoutNodeAnimation, {
      leading: false,
    })
  }, [setMoveAnimation])

  useLayoutEffect(() => {
    // skip effect logic safely if no moveAction
    if (!hasMoved || !lastMoveAction) return

    const moveAnimationName = getMoveAnimation(lastMoveAction, previousIndex, index)
    if (moveAnimationName) {
      setMoveAnimation(moveAnimationName)
      clearMoveAnimation()
    }
  }, [hasMoved, lastMoveAction, previousIndex, index, clearMoveAnimation])

  const moveDivStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!moveAnimation) return undefined

    // Common style props
    const base: React.CSSProperties = {
      transformOrigin: 'left',
      animationDuration: `${durations.layoutNodeAnimation}ms`,
      animationTimingFunction: 'ease-out',
      animationFillMode: 'none',
    }

    if (moveAnimation === 'moveThoughtOver') {
      return {
        ...base,
        animationName: 'moveThoughtOver',
        zIndex: 2,
      }
    }
    if (moveAnimation === 'moveThoughtUnder') {
      return {
        ...base,
        animationName: 'moveThoughtUnder',
      }
    }
    return undefined
  }, [moveAnimation])

  return moveDivStyle
}

export default useMoveThoughtAnimation
