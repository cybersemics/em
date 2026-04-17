import { animate, useMotionValue, useTransform } from 'framer-motion'
import React, { useCallback, useRef } from 'react'
import useSafeArea from '../../hooks/useSafeArea'
import durations from '../../util/durations'

// Dismiss score threshold (px-equivalent). The dismiss score is computed as
// swipeDistance + velocity * 1.75, so a pure-distance swipe needs 175px of
// cumulative movement, while a fast flick can dismiss with less distance
// (e.g. 80px at 60 px/s → score 80 + 105 = 185 ≥ 175).
const DEFAULT_SWIPE_DISMISS_THRESHOLD = 175

/** Minimum swipe-dismiss animation duration (seconds). */
const MIN_SWIPE_DISMISS_DURATION = 0.08
/** Maximum swipe-dismiss animation duration (seconds). */
const MAX_SWIPE_DISMISS_DURATION = 0.45

/**
 * Tracks a cumulative-distance swipe gesture and returns a 0→1 completion MotionValue.
 * A combined distance + velocity score determines whether the gesture dismisses on touch end.
 * If below threshold, completion animates back to 0.
 *
 * All visual outcomes (dismiss, spring-back, cancel) flow through the completion MotionValue.
 * The consumer maps completion to whatever visual property it needs (e.g. opacity = 1 - completion).
 * An imperative dismiss() method is provided for non-swipe dismiss paths (e.g. a Clear button).
 */
const useSwipeToClear = ({
  threshold = DEFAULT_SWIPE_DISMISS_THRESHOLD,
  onDismissed,
}: {
  /** Cumulative swipe distance (in px) at which a swipe fully fades and dismisses the tip. */
  threshold?: number
  /** Called when the dismiss completes — either immediately (swipe distance reached threshold) or after the dismiss animation finishes. */
  onDismissed: () => void
}) => {
  const swipeDistance = useMotionValue(0)
  const completion = useTransform(swipeDistance, [0, threshold], [0, 1], { clamp: true })
  const velocity = useRef(0)
  const lastTouch = useRef<{ x: number; y: number; time: number } | null>(null)
  const dismissing = useRef(false)
  const safeArea = useSafeArea()

  /** Animates swipeDistance to threshold (completion → 1), then calls onDismissed. When called without a duration (e.g. from a Clear button), uses the default medium duration. */
  const dismiss = useCallback(
    (duration: number = durations.get('medium') / 1000) => {
      dismissing.current = true
      animate(swipeDistance, threshold, {
        duration,
        ease: 'easeOut',
        onComplete: () => {
          dismissing.current = false
          onDismissed()
        },
      })
    },
    [swipeDistance, threshold, onDismissed],
  )

  /** Animates swipeDistance back to 0 (completion → 0). */
  const animateSpringBack = useCallback(() => {
    animate(swipeDistance, 0, {
      duration: durations.get('fast') / 1000,
      ease: 'easeOut',
    })
  }, [swipeDistance])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      if (dismissing.current) return
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
        if (dist >= threshold) {
          // Swipe distance already reached threshold — completion is already 1, dismiss immediately.
          onDismissed()
        } else {
          // Velocity-boosted dismiss — animate the remaining distance to threshold.
          const remainingPx = threshold - dist
          const duration = Math.max(
            MIN_SWIPE_DISMISS_DURATION,
            Math.min(MAX_SWIPE_DISMISS_DURATION, remainingPx / Math.max(velocity.current, 1)),
          )
          dismiss(duration)
        }
      } else if (dist > 0) {
        animateSpringBack()
      }
      velocity.current = 0
    },
    [swipeDistance, threshold, onDismissed, dismiss, animateSpringBack],
  )

  // When the OS intercepts a touch (e.g. iOS home-indicator swipe or app-switcher swipe),
  // it fires touchcancel instead of touchend. We must NOT evaluate the dismiss score here
  // because the partial swipe distance + velocity can exceed the threshold even though the
  // user never intended to dismiss — they were navigating at the OS level.
  const onTouchCancel = useCallback(
    (_e: React.TouchEvent) => {
      lastTouch.current = null
      velocity.current = 0
      if (swipeDistance.get() > 0) {
        animateSpringBack()
      }
    },
    [swipeDistance, animateSpringBack],
  )

  return {
    completion,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
    dismiss,
  }
}

export default useSwipeToClear
