import { throttle } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import durations from '../durations.config'
import attributeEquals from '../selectors/attributeEquals'

/**
 * The style to apply to the move div.
 */
export type MoveThoughtAnimation = React.CSSProperties | undefined

interface Options {
  /** The current on-screen index of the thought. */
  index: number
}

/**
 * Encapsulates the logic that determines the animation state when a thought is moved
 * up or down via the moveThoughtUp / moveThoughtDown reducers. This hook abstracts all
 * of the Redux selectors and timing needed so that the consuming component (TreeNode)
 * only has to deal with the resulting animation flags.
 */
const useMoveThoughtAnimation = ({ index }: Options): MoveThoughtAnimation => {
  // Selects and computes whether animation should be skipped or allowed
  const allowAnimate = useSelector((state: State) => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]

    const lastMoveType = lastPatches?.some(patch => ['moveThoughtUp', 'moveThoughtDown'].includes(patch.actions[0]))
      ? (lastPatches[0].actions[0] as 'moveThoughtUp' | 'moveThoughtDown')
      : null

    const cursor = state.cursor
    const isTableView = cursor ? attributeEquals(state, cursor[0], '=view', 'Table') : false
    const isCrossContext = (lastPatches ?? []).some(patch => patch.path?.endsWith('/parentId'))

    const skipMoveAnimation =
      (lastMoveType === 'moveThoughtUp' || lastMoveType === 'moveThoughtDown') && isCrossContext && isTableView

    return !skipMoveAnimation && !!lastMoveType
  })

  // Ref for previous index
  const prevIndexRef = useRef<number | undefined>(undefined)

  // Flag set by throttled function to allow animation
  const animateFlagRef = useRef(false)

  // Throttle to control when animation is allowed
  const markAnimateRef = useRef(
    throttle(
      () => {
        animateFlagRef.current = true
      },
      durations.layoutNodeAnimation,
      { leading: true, trailing: false },
    ),
  )

  // Cleanup throttle on unmount
  useEffect(() => () => markAnimateRef.current.cancel(), [])

  const moveDivStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!allowAnimate) {
      // Keep ref in sync even when skipping
      prevIndexRef.current = index
      return undefined
    }

    const prevIndex = prevIndexRef.current
    const indexChanged = prevIndex !== undefined && prevIndex !== index

    // Trigger the animation flag when index changes
    if (indexChanged) {
      markAnimateRef.current()
    }

    const shouldAnimate = animateFlagRef.current

    // Reset flag so that subsequent renders within the same throttle window don't animate again
    if (shouldAnimate) {
      animateFlagRef.current = false
    }

    // If not animating, update previous index and exit
    if (!shouldAnimate) {
      prevIndexRef.current = index
      return undefined
    }

    const direction: 'up' | 'down' = index < (prevIndex ?? index) ? 'up' : 'down'

    // We infer moveType purely based on direction and index change, since we don't have lastMoveType
    const isPrimary = direction === 'up' || direction === 'down'
    const moveType: 'moveThoughtAction' | 'moveThoughtDisplaced' = isPrimary
      ? 'moveThoughtAction'
      : 'moveThoughtDisplaced'

    const base: React.CSSProperties = {
      transformOrigin: 'left',
      animationDuration: `${durations.layoutNodeAnimation}ms`,
      animationTimingFunction: 'ease-out',
      animationFillMode: 'none',
    }

    prevIndexRef.current = index

    if (moveType === 'moveThoughtAction') {
      return {
        ...base,
        animationName: 'moveThoughtAction',
        zIndex: 2,
      }
    }

    return {
      ...base,
      animationName: 'moveThoughtDisplaced',
    }
  }, [index, allowAnimate])

  return moveDivStyle
}

export default useMoveThoughtAnimation
