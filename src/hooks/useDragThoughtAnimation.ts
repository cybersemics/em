import { throttle } from 'lodash'
import { useLayoutEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import { LongPressState } from '../constants'
import durations from '../durations.config'
import head from '../util/head'
import usePrevious from './usePrevious'

/**
 * Returns a style that applies the "moveThoughtOver" animation
 * when this thought was part of the most recent drag-and-drop move.
 */
const useDragThoughtAnimation = (index: number, thoughtId: string): React.CSSProperties | undefined => {
  // Detect if the last patch included a drag-and-drop moveThought.
  // Aggregate actions across the whole patch to handle merged multicursor operations.
  const isLastActionMoveThought = useSelector((state: State): boolean => {
    const lastPatches = state.undoPatches[state.undoPatches.length - 1] ?? []
    return lastPatches.some(op =>
      (op as unknown as { actions?: string[] }).actions?.some(action => action === 'moveThought'),
    )
  })

  // True if this node is part of the active drag selection
  const isDragged = useSelector(
    (state: State): boolean =>
      state.longPress === LongPressState.DragInProgress &&
      (state.draggingThoughts || []).some(path => head(path) === thoughtId),
  )

  // Track the previous on-screen index so we only animate on the first frame after an actual position change.
  // Without prevIndexChanged guard, quick consecutive renders could retrigger the animation.
  const previousIndex = usePrevious<number>(index)
  const indexChanged = previousIndex !== undefined && previousIndex !== index
  const prevIndexChanged = usePrevious(indexChanged)
  const hasMovedDnD = !!(isLastActionMoveThought && isDragged && indexChanged && !prevIndexChanged)

  const [moveAnimation, setMoveAnimation] = useState<'moveThoughtOver' | null>(null)

  // Throttle clearing the animation to avoid stacking timeouts during rapid moves.
  const clearMoveAnimation = useMemo(() => {
    return throttle(() => setMoveAnimation(null), durations.layoutNodeAnimation, { leading: false })
  }, [setMoveAnimation])

  useLayoutEffect(() => {
    // Only animate when the last action was a drag move and this node was dragged,
    // and only once per actual index change.
    if (!hasMovedDnD) return
    setMoveAnimation('moveThoughtOver')
    clearMoveAnimation()
  }, [hasMovedDnD, clearMoveAnimation])

  return useMemo<React.CSSProperties | undefined>(() => {
    if (!moveAnimation) return undefined

    return {
      transformOrigin: 'left',
      animationDuration: `${durations.layoutNodeAnimation}ms`,
      animationTimingFunction: 'ease-out',
      animationFillMode: 'none',
      animationName: 'moveThoughtOver',
      zIndex: 2,
    }
  }, [moveAnimation])
}

export default useDragThoughtAnimation
