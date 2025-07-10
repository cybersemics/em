import { useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import durations from '../durations.config'
import nextSibling from '../selectors/nextSibling'
import prevSibling from '../selectors/prevSibling'
import head from '../util/head'
import parentOf from '../util/parentOf'

/**
 * Return type of useMoveThoughtAnimation.
 */
export interface MoveThoughtAnimation {
  isMoveAnimating: boolean
  moveType: 'moveThoughtCursor' | 'moveThoughtSibling' | null
  moveDivStyle: React.CSSProperties | undefined
}

interface Options {
  /** The id of the current thought (its Lexeme id). */
  thoughtId: string
  /** True if this TreeNode represents the current cursor. */
  isCursor: boolean
}

/**
 * Encapsulates the logic that determines the animation state when a thought is moved
 * up or down via the moveThoughtUp / moveThoughtDown reducers. This hook abstracts all
 * of the Redux selectors and timing needed so that the consuming component (TreeNode)
 * only has to deal with the resulting animation flags.
 */
const useMoveThoughtAnimation = ({ thoughtId, isCursor }: Options): MoveThoughtAnimation => {
  const [isMoveAnimating, setIsMoveAnimating] = useState(false)

  /** Determine if the last undo patch action was moveThoughtUp or moveThoughtDown, and its type. */
  const lastMoveType = useSelector((state: State): 'moveThoughtUp' | 'moveThoughtDown' | null => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    return lastPatches?.some(patch => ['moveThoughtUp', 'moveThoughtDown'].includes(patch.actions[0]))
      ? (lastPatches[0].actions[0] as 'moveThoughtUp' | 'moveThoughtDown')
      : null
  })

  /**
   * Id of the thought that was displaced by the cursor during a moveThoughtUp/Down operation.
   * Normally, this is the sibling that swaps places with the cursor.
   * In cross-context moves (e.g., moving the only child of A into the next uncle B),
   * there is no displaced sibling, so we animate the parent that just lost the cursor (now the cursor's new uncle).
   */
  const movingThoughtId = useSelector((state: State) => {
    if (!lastMoveType || !state.cursor) return null

    // Immediate siblings of the cursor at its NEW location
    const next = nextSibling(state, state.cursor)
    const prev = prevSibling(state, state.cursor, {})

    if (lastMoveType === 'moveThoughtUp') {
      // Try displaced sibling first (next if available, otherwise prev)
      const displaced = next ?? prev
      if (displaced) return displaced.id

      // No sibling means cross-context move. Animate the parent that just lost the cursor (now the cursor's new uncle).
      const oldParent = nextSibling(state, parentOf(state.cursor!))
      return oldParent?.id ?? null
    }

    if (lastMoveType === 'moveThoughtDown') {
      // Try displaced sibling first (prev if available, otherwise next)
      const displaced = prev ?? next
      if (displaced) return displaced.id

      // No sibling means cross-context move. Animate the uncle (new parent) that gained the cursor.
      const newParentId = head(parentOf(state.cursor!))
      return newParentId ?? null
    }

    return null
  })

  // Determine animation type for moveThought
  const moveType: 'moveThoughtCursor' | 'moveThoughtSibling' | null = lastMoveType
    ? isCursor
      ? 'moveThoughtCursor'
      : thoughtId === movingThoughtId
        ? 'moveThoughtSibling'
        : null
    : null

  // Manage the move animation flag
  useLayoutEffect(() => {
    // Start moveThought animation only when the change originated from a moveThought action.
    // In moves that cross contexts (e.g. moving the only child of «A» below its next uncle «B»),
    // there is no displaced sibling, so `movingThoughtId` is null. Still animate the cursor node.
    if (lastMoveType && (isCursor || movingThoughtId)) {
      setIsMoveAnimating(true)
    }

    // After the layout node animation duration reset the flag so that subsequent
    // updates can re-trigger the animation.
    const timer = setTimeout(() => {
      setIsMoveAnimating(false)
    }, 0.5 * durations.layoutNodeAnimation)

    return () => clearTimeout(timer)
  }, [lastMoveType, movingThoughtId, isCursor])

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
