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
  /**
   * Animation - moveThoughtAction: Node moved in the same direction as the action (primary).
   * Animation - moveThoughtDisplaced: Node moved opposite to the action direction (secondary).
   */
  moveType: 'moveThoughtAction' | 'moveThoughtDisplaced' | null
  moveDivStyle: React.CSSProperties | undefined
}

interface Options {
  /** True if the index of the thought has changed. */
  indexChanged: boolean
  /** The previous on-screen index of the thought. */
  previousIndex: number | undefined
  /** The current on-screen index of the thought. */
  index: number
}

/**
 * Encapsulates the logic that determines the animation state when a thought is moved
 * up or down via the moveThoughtUp / moveThoughtDown reducers. This hook abstracts all
 * of the Redux selectors and timing needed so that the consuming component (TreeNode)
 * only has to deal with the resulting animation flags.
 */
const useMoveThoughtAnimation = ({ indexChanged, previousIndex, index }: Options): MoveThoughtAnimation => {
  const [isMoveAnimating, setIsMoveAnimating] = useState(false)

  const lastMoveType = useSelector((state: State) => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    const moveType = lastPatches?.some(patch => ['moveThoughtUp', 'moveThoughtDown'].includes(patch.actions[0]))
      ? (lastPatches[0].actions[0] as 'moveThoughtUp' | 'moveThoughtDown')
      : null
    return moveType
  })

  // Capture the previous value of indexChanged
  const prevIndexChanged = usePrevious(indexChanged)

  // Capture the proposed moveType
  const hasMoved = useMemo(() => {
    return !!(lastMoveType && indexChanged && !prevIndexChanged)
  }, [lastMoveType, indexChanged, prevIndexChanged])

  const [moveType, setMoveType] = useState<'moveThoughtAction' | 'moveThoughtDisplaced' | null>(null)

  let proposedMoveType: 'moveThoughtAction' | 'moveThoughtDisplaced' | null = null

  if (hasMoved && previousIndex !== undefined) {
    // Determine actual movement direction of this node relative to its previous on-screen index.
    const direction: 'up' | 'down' = index < previousIndex ? 'up' : 'down'

    const isPrimary =
      (lastMoveType === 'moveThoughtUp' && direction === 'up') ||
      (lastMoveType === 'moveThoughtDown' && direction === 'down')

    proposedMoveType = isPrimary ? 'moveThoughtAction' : 'moveThoughtDisplaced'
  }

  // Implement the move type on the next render cycle
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
    if (lastMoveType && moveType) {
      setIsMoveAnimating(true)
    }

    // After the layout node animation duration reset the flag so that subsequent
    // updates can re-trigger the animation.
    const timer = setTimeout(() => {
      setIsMoveAnimating(false)
      setMoveType(null)
      // Adjust timeout to apply before animation finishes
      // to avoid race condition with the next render cycle
    }, 0.5 * durations.layoutNodeAnimation)

    return () => clearTimeout(timer)
  }, [lastMoveType, moveType])

  const moveDivStyle = isMoveAnimating
    ? moveType === 'moveThoughtAction'
      ? {
          transformOrigin: 'left',
          transform: 'scale3d(1.5, 1.5, 1)',
          transition: `transform {durations.layoutNodeAnimation} ease-out`,
        }
      : moveType === 'moveThoughtDisplaced'
        ? {
            transformOrigin: 'left',
            transform: 'scale3d(0.5, 0.5, 1)',
            filter: 'blur(2px)',
            opacity: 0,
          }
        : undefined
    : moveType === 'moveThoughtAction'
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
