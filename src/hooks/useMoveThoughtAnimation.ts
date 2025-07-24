import { throttle } from 'lodash'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import durations from '../durations.config'
import attributeEquals from '../selectors/attributeEquals'
import usePrevious from './usePrevious'

/**
 * The style to apply to the move div.
 */
export type MoveThoughtAnimation = React.CSSProperties | undefined

interface Options {
  /** The current on-screen index of the thought. */
  index: number
}

/**
 * Determines the move animation type for a thought based on the previous and current indices and the last move action.
 * Returns:
 * - 'moveThoughtAction' when this thought is the one explicitly moved by the user.
 * - 'moveThoughtDisplaced' when this thought is displaced by another thought moving past it.
 * - null when the movement does not require an animation (e.g. indices unchanged or lastMoveType is null).
 */
const getMoveType = (
  lastMoveType: 'moveThoughtUp' | 'moveThoughtDown' | null,
  previousIndex: number | undefined,
  currentIndex: number,
): 'moveThoughtAction' | 'moveThoughtDisplaced' | null => {
  if (!lastMoveType || previousIndex === undefined) return null

  // Determine actual movement direction of this node relative to its previous on-screen index.
  const direction: 'up' | 'down' = currentIndex < previousIndex ? 'up' : 'down'

  const isPrimary =
    (lastMoveType === 'moveThoughtUp' && direction === 'up') ||
    (lastMoveType === 'moveThoughtDown' && direction === 'down')

  return isPrimary ? 'moveThoughtAction' : 'moveThoughtDisplaced'
}

/**
 * Encapsulates the logic that determines the animation state when a thought is moved
 * up or down via the moveThoughtUp / moveThoughtDown reducers. This hook abstracts all
 * of the Redux selectors and timing needed so that the consuming component (TreeNode)
 * only has to deal with the resulting animation flags.
 */
const useMoveThoughtAnimation = ({ index }: Options): MoveThoughtAnimation => {
  const lastMoveType = useSelector((state: State) => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]

    // Determine if the last action was a moveThoughtUp or moveThoughtDown.
    const moveType = lastPatches?.some(patch => ['moveThoughtUp', 'moveThoughtDown'].includes(patch.actions[0]))
      ? (lastPatches[0].actions[0] as 'moveThoughtUp' | 'moveThoughtDown')
      : null

    if (!moveType) return null

    // Determine if we should skip the animation (cross-context move inside a Table view).
    const cursor = state.cursor
    const isTableView = cursor ? cursor.some(id => attributeEquals(state, id, '=view', 'Table')) : false
    const isCrossContext = (lastPatches ?? []).some(patch => patch.path?.endsWith('/parentId'))

    const skipMoveAnimation = isCrossContext && isTableView

    return skipMoveAnimation ? null : moveType
  })

  // Determine if the on-screen index has changed since the last render.
  const previousIndex = usePrevious<number>(index)
  const indexChanged = previousIndex !== undefined && previousIndex !== index

  // Capture the previous value of indexChanged so we know when it changes between renders.
  const prevIndexChanged = usePrevious(indexChanged)

  // Compute if this thought has moved this render cycle.
  const hasMoved = !!(lastMoveType && indexChanged && !prevIndexChanged)

  const [moveType, setMoveType] = useState<'moveThoughtAction' | 'moveThoughtDisplaced' | null>(null)

  /**
   * Throttled reset of moveType to null after the layout node animation duration.
   * Using throttle allows us to avoid manually managing timers.
   * The function will execute on the trailing edge only.
   */
  const markAnimateRef = useMemo(
    () => throttle(() => setMoveType(null), durations.layoutNodeAnimation, { leading: false }),
    [setMoveType],
  )

  useLayoutEffect(() => {
    if (!hasMoved) return

    const nextMoveType = getMoveType(lastMoveType, previousIndex, index)
    if (nextMoveType) {
      setMoveType(nextMoveType)
      markAnimateRef.cancel()
      markAnimateRef()
    }
  }, [hasMoved, lastMoveType, index, markAnimateRef, previousIndex])

  // Cancel the throttled reset on unmount to avoid setting state on an unmounted component.
  useEffect(() => () => markAnimateRef.cancel(), [markAnimateRef])

  const moveDivStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!moveType) return undefined

    // Common style props
    const base: React.CSSProperties = {
      transformOrigin: 'left',
      animationDuration: `${durations.layoutNodeAnimation}ms`,
      animationTimingFunction: 'ease-out',
      animationFillMode: 'none',
    }

    if (moveType === 'moveThoughtAction') {
      return {
        ...base,
        animationName: 'moveThoughtAction',
        zIndex: 2,
      }
    }
    if (moveType === 'moveThoughtDisplaced') {
      return {
        ...base,
        animationName: 'moveThoughtDisplaced',
      }
    }
    return undefined
  }, [moveType])

  return moveDivStyle
}

export default useMoveThoughtAnimation
