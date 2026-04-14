import { animate, useMotionValue, useTransform } from 'framer-motion'
import React, { useCallback, useRef } from 'react'
import useSafeArea from '../../hooks/useSafeArea'
import durations from '../../util/durations'

// Dismiss score threshold (px-equivalent). The dismiss score is computed as
// swipeDistance + velocity * 1.75, so a pure-distance swipe needs 175px of
// cumulative movement, while a fast flick can dismiss with less distance
// (e.g. 80px at 60 px/s → score 80 + 105 = 185 ≥ 175).
const DEFAULT_SWIPE_DISMISS_THRESHOLD = 175

/**
 * Tracks a cumulative-distance swipe gesture and returns a 0→1 completion MotionValue.
 * A combined distance + velocity score determines whether the gesture dismisses on touch end.
 * If below threshold, completion animates back to 0.
 */
const useSwipeToClear = ({
  threshold = DEFAULT_SWIPE_DISMISS_THRESHOLD,
  onDismiss,
}: {
  /** Cumulative swipe distance (in px) at which a swipe fully fades and dismisses the tip. */
  threshold?: number
  /** Called when the swipe decides to dismiss. `immediate` is true when the gesture already fully completed (completion reached 1). `velocity` is the smoothed swipe velocity in px/s at the moment of release. `threshold` is the dismiss threshold in px used for the score calculation. */
  onDismiss: (immediate: boolean, velocity: number, threshold: number) => void
}) => {
  const swipeDistance = useMotionValue(0)
  const completion = useTransform(swipeDistance, [0, threshold], [0, 1], { clamp: true })
  const velocity = useRef(0)
  const lastTouch = useRef<{ x: number; y: number; time: number } | null>(null)
  const safeArea = useSafeArea()

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      const touch = e.touches[0]

      // Ignore touches that start in safe areas, since those are likely accidental touches from users trying to interact with system UI.
      // Extra 16px buffer above the bottom inset absorbs imprecise home-swipe starts that land just above the indicator.
      if (touch.clientY < safeArea.top || touch.clientY > window.innerHeight - safeArea.bottom - 16) {
        lastTouch.current = null
        return
      }

      lastTouch.current = { x: touch.pageX, y: touch.pageY, time: performance.now() }
      velocity.current = 0
      swipeDistance.set(0)
    },
    [safeArea.top, safeArea.bottom, swipeDistance],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      if (!lastTouch.current) return
      const touch = e.touches[0]
      const now = performance.now()

      const moveDx = touch.pageX - lastTouch.current.x
      const moveDy = touch.pageY - lastTouch.current.y
      const segmentDistance = Math.sqrt(moveDx * moveDx + moveDy * moveDy)

      const dt = now - lastTouch.current.time
      if (dt > 0) {
        const instantVelocity = (segmentDistance / dt) * 1000
        // Exponential moving average: 60% weight on latest sample for responsive tracking, 40% on history to smooth jitter.
        velocity.current = velocity.current * 0.4 + instantVelocity * 0.6
      }

      lastTouch.current = { x: touch.pageX, y: touch.pageY, time: now }

      swipeDistance.set(swipeDistance.get() + segmentDistance)
    },
    [swipeDistance],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      lastTouch.current = null

      const dist = swipeDistance.get()
      const score = dist + velocity.current * 1.75

      if (score >= threshold) {
        const immediate = dist >= threshold
        swipeDistance.set(0)
        onDismiss(immediate, velocity.current, threshold)
      } else if (dist > 0) {
        animate(swipeDistance, 0, {
          duration: durations.get('fast') / 1000,
          ease: 'easeOut',
        })
      }
      velocity.current = 0
    },
    [swipeDistance, threshold, onDismiss],
  )

  return {
    completion,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  }
}

export default useSwipeToClear
