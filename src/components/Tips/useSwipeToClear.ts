import { animate } from 'framer-motion'
import React, { useCallback, useRef, useState } from 'react'
import durations from '../../util/durations'

/**
 * Tracks a cumulative-distance swipe gesture and returns a 0→1 completion value.
 * A combined distance + velocity score determines whether the gesture dismisses on touch end.
 * If below threshold, completion animates back to 0.
 */
const useSwipeToClear = ({
  threshold,
  onDismiss,
}: {
  threshold: number
  /** Called when the swipe decides to dismiss. `immediate` is true when the gesture already fully completed (completion reached 1). */
  onDismiss: (immediate: boolean) => void
}) => {
  const [swipeDistance, setSwipeDistance] = useState(0)
  const velocity = useRef(0)
  const lastTouch = useRef<{ x: number; y: number; time: number } | null>(null)

  const completion = Math.min(1, swipeDistance / threshold)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    const touch = e.touches[0]
    lastTouch.current = { x: touch.pageX, y: touch.pageY, time: performance.now() }
    velocity.current = 0
    setSwipeDistance(0)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    if (!lastTouch.current) return
    const touch = e.touches[0]
    const now = performance.now()

    const moveDx = touch.pageX - lastTouch.current.x
    const moveDy = touch.pageY - lastTouch.current.y
    const segmentDistance = Math.sqrt(moveDx * moveDx + moveDy * moveDy)

    setSwipeDistance(prev => prev + segmentDistance)

    const dt = now - lastTouch.current.time
    if (dt > 0) {
      const instantVelocity = (segmentDistance / dt) * 1000
      velocity.current = velocity.current * 0.4 + instantVelocity * 0.6
    }

    lastTouch.current = { x: touch.pageX, y: touch.pageY, time: now }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      lastTouch.current = null

      const score = swipeDistance + velocity.current * 0.5
      if (score >= threshold) {
        const immediate = swipeDistance >= threshold
        setSwipeDistance(0)
        onDismiss(immediate)
      } else if (swipeDistance > 0) {
        animate(swipeDistance, 0, {
          duration: durations.get('fast') / 1000,
          ease: 'easeOut',
          onUpdate: v => setSwipeDistance(v),
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
