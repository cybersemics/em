import { useLayoutEffect, useMemo, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import State from '../@types/State'
import durations from '../durations.config'
import attributeEquals from '../selectors/attributeEquals'
import usePrevious from './usePrevious'

/**
 * Return type of useMoveThoughtAnimation.
 */
export interface MoveThoughtAnimation {
  /** The style to apply to the move div. */
  moveDivStyle: React.CSSProperties | undefined
}

interface Options {
  /** The current on-screen index of the thought. */
  index: number
}

let keyframesInjected = false
/**
 * Inject keyframes into the document head.
 * This is done here to ensure that the keyframes are available as soon as the module is evaluated.
 */
const injectKeyframes = () => {
  if (keyframesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.id = 'move-thought-animation-keyframes'
  style.textContent = `
    @keyframes moveThoughtAction {
      0% { transform: scale3d(1, 1, 1); }
      50% { transform: scale3d(1.5, 1.5, 1); }
      100% { transform: scale3d(1, 1, 1); }
    }
    @keyframes moveThoughtDisplaced {
      0% { transform: scale3d(1, 1, 1); opacity: 1; filter: blur(0); }
      50% { transform: scale3d(0.5, 0.5, 1); opacity: 0.5; filter: blur(2px); }
      100% { transform: scale3d(1, 1, 1); opacity: 1; filter: blur(0); }
    }
  `
  document.head.appendChild(style)
  keyframesInjected = true
}

// Ensure keyframes are available as soon as the module is evaluated (client-side only)
injectKeyframes()

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

  // Determine if the on-screen index has changed since the last render.
  const previousIndex = usePrevious<number>(index)
  const indexChanged = previousIndex !== undefined && previousIndex !== index

  // Capture the previous value of indexChanged so we know when it changes between renders.
  const prevIndexChanged = usePrevious(indexChanged)

  // Capture the proposed moveType. Only compute on the render where indexChanged flips to true.
  const hasMoved = !!(lastMoveType && indexChanged && !prevIndexChanged)

  const [moveType, setMoveType] = useState<'moveThoughtAction' | 'moveThoughtDisplaced' | null>(null)

  // skip move animation if the last move was a cross-context move in a table view
  const skipMoveAnimation =
    (lastMoveType === 'moveThoughtUp' || lastMoveType === 'moveThoughtDown') && isCrossContext && isTableView

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
    // After the layout node animation duration reset the flag so that subsequent
    // updates can re-trigger the animation.
    const timer = setTimeout(() => {
      setMoveType(null)
    }, durations.layoutNodeAnimation)

    return () => clearTimeout(timer)
  }, [lastMoveType, moveType])

  const moveDivStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!moveType || skipMoveAnimation) return undefined

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
  }, [moveType, skipMoveAnimation])

  // Override animation output when skipping is requested.
  if (skipMoveAnimation) {
    return {
      moveDivStyle: undefined,
    }
  }

  return {
    moveDivStyle,
  }
}

export default useMoveThoughtAnimation
