import { throttle } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
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
  const { lastMoveType, isTableView, isCrossContext } = useSelector((state: State) => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]

    const lastMoveType = lastPatches?.some(patch => ['moveThoughtUp', 'moveThoughtDown'].includes(patch.actions[0]))
      ? (lastPatches[0].actions[0] as 'moveThoughtUp' | 'moveThoughtDown')
      : null

    const cursor = state.cursor
    const isTableView = cursor ? attributeEquals(state, cursor[0], '=view', 'Table') : false
    const isCrossContext = (lastPatches ?? []).some(patch => patch.path?.endsWith('/parentId'))

    return {
      lastMoveType,
      isTableView,
      isCrossContext,
    }
  }, shallowEqual)

  // skip move animation if the last move was a cross-context move in a table view
  const skipMoveAnimation =
    (lastMoveType === 'moveThoughtUp' || lastMoveType === 'moveThoughtDown') && isCrossContext && isTableView

  // ref for previous index
  const prevIndexRef = useRef<number | undefined>(undefined)

  // flag set by a throttled function to permit animation
  const animateFlagRef = useRef(false)

  // throttled function that toggles the animate flag. Leading = true, trailing = false means it will
  // set the flag immediately and then suppress subsequent calls within the animation window.
  const markAnimateRef = useRef(
    throttle(
      () => {
        animateFlagRef.current = true
      },
      durations.layoutNodeAnimation,
      { leading: true, trailing: false },
    ),
  )

  // cancel the throttled function on unmount to avoid stray callbacks
  useEffect(() => () => markAnimateRef.current.cancel(), [])

  const moveDivStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (skipMoveAnimation) {
      // keep ref in sync even when skipping
      prevIndexRef.current = index
      return undefined
    }

    // store previous index locally to avoid it being overwritten before we calculate direction
    const prevIndex = prevIndexRef.current

    const indexChanged = prevIndex !== undefined && prevIndex !== index

    // trigger the throttled flag setter when a move is detected
    if (lastMoveType && indexChanged) {
      markAnimateRef.current()
    }

    const shouldAnimate = animateFlagRef.current

    // reset flag so that subsequent renders within the same throttle window don't animate again
    if (shouldAnimate) {
      animateFlagRef.current = false
    }

    // If we are not animating, update prevIndexRef and exit early.
    if (!shouldAnimate) {
      prevIndexRef.current = index
      return undefined
    }

    // Determine actual movement direction relative to previous index (before updating the ref).
    const direction: 'up' | 'down' = index < (prevIndex ?? index) ? 'up' : 'down'

    const isPrimary =
      (lastMoveType === 'moveThoughtUp' && direction === 'up') ||
      (lastMoveType === 'moveThoughtDown' && direction === 'down')

    const moveType: 'moveThoughtAction' | 'moveThoughtDisplaced' = isPrimary
      ? 'moveThoughtAction'
      : 'moveThoughtDisplaced'

    // common style props
    const base: React.CSSProperties = {
      transformOrigin: 'left',
      animationDuration: `${durations.layoutNodeAnimation}ms`,
      animationTimingFunction: 'ease-out',
      animationFillMode: 'none',
    }

    // Update prevIndexRef after we've calculated the direction and moveType so that the next render has the correct reference point.
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
  }, [index, lastMoveType, skipMoveAnimation])

  return moveDivStyle
}

export default useMoveThoughtAnimation
