import { useLayoutEffect, useMemo, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import Path from '../@types/Path'
import State from '../@types/State'
import durations from '../durations.config'
import equalPath from '../util/equalPath'
import parentOf from '../util/parentOf'
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
  /** The path of the thought. */
  path: Path
}

/**
 * Encapsulates the logic that determines the animation state when a thought is moved
 * up or down via the moveThoughtUp / moveThoughtDown reducers. This hook abstracts all
 * of the Redux selectors and timing needed so that the consuming component (TreeNode)
 * only has to deal with the resulting animation flags.
 */
const useMoveThoughtAnimation = ({ isCursor, indexChanged, path }: Options): MoveThoughtAnimation => {
  const [isMoveAnimating, setIsMoveAnimating] = useState(false)

  const { lastMoveType, isSiblingOfCursor } = useSelector((state: State) => {
    // Determine if the last undo patch action was moveThoughtUp or moveThoughtDown, and its type.
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    const lastMoveType: 'moveThoughtUp' | 'moveThoughtDown' | null = lastPatches?.some(patch =>
      ['moveThoughtUp', 'moveThoughtDown'].includes(patch.actions[0]),
    )
      ? (lastPatches[0].actions[0] as 'moveThoughtUp' | 'moveThoughtDown')
      : null

    // Determine if this node is a sibling of the cursor (i.e., shares the same parent path)
    const isSiblingOfCursor = (() => {
      if (isCursor || !state.cursor) return false
      return equalPath(parentOf(state.cursor), parentOf(path))
    })()

    return {
      lastMoveType,
      isSiblingOfCursor,
    }
  }, shallowEqual)

  // Capture the previous value of indexChanged
  const prevIndexChanged = usePrevious(indexChanged)

  // Capture the proposed moveType
  const hasMoved = useMemo(() => {
    return !!(lastMoveType && indexChanged && !prevIndexChanged)
  }, [lastMoveType, indexChanged, prevIndexChanged])

  const [moveType, setMoveType] = useState<'moveThoughtCursor' | 'moveThoughtSibling' | null>(null)

  let proposedMoveType: 'moveThoughtCursor' | 'moveThoughtSibling' | null = null

  if (hasMoved) {
    if (isCursor) {
      // Animate the cursor node
      proposedMoveType = 'moveThoughtCursor'
    } else {
      // Animate the sibling node
      proposedMoveType = isSiblingOfCursor ? 'moveThoughtSibling' : null
    }
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
    if (lastMoveType && (isCursor || moveType)) {
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
