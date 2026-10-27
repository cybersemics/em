import { useCallback, useEffect, useRef } from 'react'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import haptics from '../../util/haptics'

/**
 * Tap and hold on the ring. A press held for TIMEOUT_LONG_PRESS_THOUGHT plays a light haptic and calls onHold. The
 * browser still sends a click when a held press is released, so `consumeHold` tells the click handler to ignore it.
 *
 * The app's useLongPress is built for dragging thoughts (react-dnd and the long-press state in Redux), so the ring
 * keeps this smaller timer of its own.
 */
const useRingHold = (onHold: () => void) => {
  const holdTimer = useRef<number | undefined>(undefined)
  // The hold fired, so the click that follows its release must be ignored.
  const held = useRef(false)
  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  /** Starts timing a press. */
  const start = useCallback(() => {
    held.current = false
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      held.current = true
      haptics.light()
      onHold()
    }, TIMEOUT_LONG_PRESS_THOUGHT)
  }, [onHold])

  /** Stops timing a press that ended or left the ring before it became a hold. */
  const cancel = useCallback(() => window.clearTimeout(holdTimer.current), [])

  /** Returns whether the click that just arrived is the release of a hold, which should be ignored. */
  const consumeHold = useCallback(() => {
    const wasHeld = held.current
    held.current = false
    return wasHeld
  }, [])

  return { start, cancel, consumeHold }
}

export default useRingHold
