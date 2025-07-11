import { useLayoutEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import durations from '../durations.config'
import usePrevious from './usePrevious'

/**
 * Return type of useMoveThoughtAnimation.
 */
export interface MoveThoughtAnimation {
  isMoveAnimating: boolean
  moveType: 'moveThoughtCursor' | 'moveThoughtSibling' | null
  moveDivStyle: React.CSSProperties | undefined
}

interface Options {
  /** True if this TreeNode represents the current cursor. */
  isCursor: boolean
  /** True if the index of the thought has changed. */
  indexChanged: boolean
}

/**
 * Encapsulates the logic that determines the animation state when a thought is moved
 * up or down via the moveThoughtUp / moveThoughtDown reducers. This hook abstracts all
 * of the Redux selectors and timing needed so that the consuming component (TreeNode)
 * only has to deal with the resulting animation flags.
 */
const useMoveThoughtAnimation = ({ isCursor, indexChanged }: Options): MoveThoughtAnimation => {
  const [isMoveAnimating, setIsMoveAnimating] = useState(false)

  /** Determine if the last undo patch action was moveThoughtUp or moveThoughtDown, and its type. */
  const lastMoveType = useSelector((state: State): 'moveThoughtUp' | 'moveThoughtDown' | null => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    return lastPatches?.some(patch => ['moveThoughtUp', 'moveThoughtDown'].includes(patch.actions[0]))
      ? (lastPatches[0].actions[0] as 'moveThoughtUp' | 'moveThoughtDown')
      : null
  })

  // Capture the previous value of indexChanged so we can detect the rising edge (changed -> unchanged)
  const prevIndexChanged = usePrevious(indexChanged)

  // Capture the proposed moveType on the rising edge so it can be locked for the duration of the animation
  const hasMoved = useMemo(() => {
    return !!(lastMoveType && indexChanged && !prevIndexChanged)
  }, [lastMoveType, indexChanged, prevIndexChanged])

  // Lock the moveType after the first detection so that it does not reset
  const [moveType, setMoveType] = useState<'moveThoughtCursor' | 'moveThoughtSibling' | null>(null)

  // Determine proposed moveType based on current render
  const proposedMoveType: 'moveThoughtCursor' | 'moveThoughtSibling' | null = hasMoved
    ? isCursor
      ? 'moveThoughtCursor'
      : 'moveThoughtSibling'
    : null

  // Lock the move type on the rising edge
  useLayoutEffect(() => {
    if (proposedMoveType) {
      setMoveType(proposedMoveType)
    }
  }, [proposedMoveType])

  // Manage the move animation flag
  useLayoutEffect(() => {
    // Start moveThought animation only when the change originated from a moveThought action.
    // In moves that cross contexts (e.g. moving the only child of «A» below its next uncle «B»),
    // there is no displaced sibling, so `movingThoughtId` is null. Still animate the cursor node.
    if (lastMoveType && (isCursor || moveType)) {
      setIsMoveAnimating(true)
    }

    // After the layout node animation duration reset the flag so that subsequent
    // updates can re-trigger the animation.
    const timer = setTimeout(() => {
      setIsMoveAnimating(false)
      setMoveType(null)
    }, 0.5 * durations.layoutNodeAnimation)

    return () => clearTimeout(timer)
  }, [lastMoveType, moveType, isCursor])

  const moveDivStyle = isMoveAnimating
    ? moveType === 'moveThoughtCursor'
      ? {
          transformOrigin: 'left',
          transform: 'scale3d(1.5, 1.5, 1)',
          transition: `transform {durations.layoutNodeAnimation} ease-out`,
        }
      : moveType === 'moveThoughtSibling'
        ? {
            transformOrigin: 'left',
            transform: 'scale3d(0.5, 0.5, 1)',
            filter: 'blur(2px)',
            opacity: 0,
          }
        : undefined
    : moveType === 'moveThoughtCursor'
      ? {
          transformOrigin: 'left',
          transform: 'scale3d(1, 1, 1)',
        }
      : undefined

  return {
    isMoveAnimating,
    moveType,
    moveDivStyle,
  }
}

export default useMoveThoughtAnimation
