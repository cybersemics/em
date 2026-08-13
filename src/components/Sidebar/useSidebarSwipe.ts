import { MotionValue } from 'framer-motion'
import { RefObject, useEffect, useEffectEvent, useRef, useState } from 'react'
import { LongPressState } from '../../constants'
import store from '../../stores/app'

/** MUI-style uncertainty threshold for direction detection (in pixels). */
const UNCERTAINTY_THRESHOLD = 3

interface UseSidebarSwipeOptions {
  /** The gesture only runs while the sidebar is open. */
  enabled: boolean
  /** The drawer element. Used to distinguish backdrop-initiated swipes from in-drawer ones. */
  drawerRef: RefObject<HTMLDivElement | null>
  /** Live drawer width in px. Doubles as the clamp bound and the backdrop→drawer hit test. */
  width: number
  /** Shared drawer position (0 = open, -width = closed). The hook writes to it mid-swipe. */
  x: MotionValue<number>
  /** Called once on release with the drag distance (px) and smoothed velocity (px/s). The caller
   * decides whether to close the drawer or snap it back open. */
  onSwipeEnd: (offset: number, velocity: number) => void
}

/**
 * Document-level touch state machine for swiping the sidebar closed, including swipes that begin
 * outside the drawer (on the backdrop). Adapted from MUI's SwipeableDrawer implementation, which —
 * unlike Framer Motion's drag — detects touches originating outside the drawer, waits until the
 * direction is clear (a 3px threshold) before committing to swipe vs scroll, and calls
 * preventDefault() to disable scrolling once the gesture commits to a swipe.
 *
 * The hook owns the `isSwiping` flag (true while a horizontal swipe is in progress) and returns it
 * alongside its setter — the setter is shared because the drawer's own `onTouchMove` handler also
 * flips the flag when the drawer has moved. Consumers use `isSwiping` to disable Favorites
 * drag-and-drop so the two gestures don't fight.
 */
const useSidebarSwipe = ({ enabled, drawerRef, width, x, onSwipeEnd }: UseSidebarSwipeOptions) => {
  /** Whether a horizontal swipe is currently in progress. */
  const [isSwiping, setIsSwiping] = useState(false)

  /** Stable-identity wrapper that always calls the latest onSwipeEnd — lets the touch listeners
   * below stay registered across renders without depending on the caller's callback identity. */
  const handleSwipeEnd = useEffectEvent(onSwipeEnd)

  /** Per-touch swipe state for the manual touch handler. We don't use framer-motion's drag because
   * it has no "wait and see" phase to disambiguate horizontal swipe from vertical scroll — this
   * state machine, adapted from MUI's SwipeableDrawer, fills that gap. */
  const swipeState = useRef({
    /** Whether a touch is currently being tracked. */
    active: false,
    /** Null = direction not yet determined, true = horizontal swipe, false = vertical scroll. */
    isSwiping: null as boolean | null,
    /** True if the touch started outside the drawer (i.e. on the backdrop). */
    startedOnBackdrop: false,
    /** For backdrop-initiated swipes: true once the finger has crossed onto the drawer. */
    drawerHit: false,
    startX: 0,
    startY: 0,
    /** Last-move timestamp + position, used to compute a smoothed release velocity. */
    lastTime: 0,
    lastX: 0,
    velocity: 0,
  })

  useEffect(() => {
    if (!enabled) return

    /** Handle touch start event – record the position of the touch and set up event listeners for touch move and touch end. */
    const handleTouchStart = (e: TouchEvent) => {
      const touchX = e.touches[0].clientX
      const touchY = e.touches[0].clientY
      const startedOnBackdrop = !drawerRef.current?.contains(e.target as Node)

      // Reset swipe state
      swipeState.current = {
        active: true,
        isSwiping: null, // Direction not yet determined
        startedOnBackdrop,
        drawerHit: !startedOnBackdrop, // If started inside drawer, we've already "hit" it
        startX: touchX,
        startY: touchY,
        lastTime: performance.now(),
        lastX: touchX,
        velocity: 0,
      }
    }

    /** Handle touch move – handle touch move event and update drawer position based on swipe direction. */
    const handleTouchMove = (e: TouchEvent) => {
      const swipe = swipeState.current
      if (!swipe.active) return

      // Don't swipe the sidebar closed while a thought is being dragged
      const longPress = store.getState().longPress
      if (longPress === LongPressState.DragHold || longPress === LongPressState.DragInProgress) return

      // Prevent backdrop touches before Android begins its overscroll bounce.
      if (swipe.startedOnBackdrop && e.cancelable) {
        e.preventDefault()
      }

      const touchX = e.touches[0].clientX
      const touchY = e.touches[0].clientY
      const now = performance.now()

      // Calculate velocity (smoothed, like MUI)
      const dt = now - swipe.lastTime
      if (dt > 0) {
        const instantVelocity = ((swipe.lastX - touchX) / dt) * 1000 // px/s, positive = moving left
        swipe.velocity = swipe.velocity * 0.4 + instantVelocity * 0.6
      }
      swipe.lastTime = now
      swipe.lastX = touchX

      // For backdrop-initiated swipes, check if finger has entered the drawer
      if (swipe.startedOnBackdrop && !swipe.drawerHit) {
        if (touchX < width) {
          // Finger just entered drawer - "pick it up"
          swipe.drawerHit = true
          swipe.startX = touchX
          swipe.startY = touchY
        } else {
          // Finger still outside drawer - don't move drawer yet
          return
        }
      }

      // Direction detection (MUI-style): Wait until we exceed the uncertainty threshold
      if (swipe.isSwiping === null) {
        const dx = Math.abs(touchX - swipe.startX)
        const dy = Math.abs(touchY - swipe.startY)

        // Not enough movement yet to determine direction
        if (dx < UNCERTAINTY_THRESHOLD && dy < UNCERTAINTY_THRESHOLD) {
          return
        }

        // Determine direction: horizontal swipe (close drawer) or vertical scroll
        const isHorizontal = dx > dy

        if (isHorizontal) {
          // It's a horizontal swipe - we'll handle it
          swipe.isSwiping = true
          // Reset start position to current position for smoother tracking
          swipe.startX = touchX
          setIsSwiping(true)
        } else {
          // It's a vertical scroll - let the browser handle it
          swipe.isSwiping = false
          return
        }
      }

      // If we determined this is a scroll (not a swipe), ignore further moves
      if (!swipe.isSwiping) {
        return
      }

      // Move the drawer to follow the finger
      const dragOffset = touchX - swipe.startX // Negative when dragging left
      const newX = Math.max(-width, Math.min(0, dragOffset)) // Clamp to valid range
      x.set(newX)

      // Prevent scrolling while swiping
      if (e.cancelable) {
        e.preventDefault()
      }
    }

    /** Handle touch end. */
    const handleTouchEnd = () => {
      const swipe = swipeState.current
      if (!swipe.active) return

      // Only process if we were actually swiping
      if (swipe.isSwiping && swipe.drawerHit) {
        const offset = Math.abs(x.get())
        const velocity = Math.max(swipe.velocity, 0)
        handleSwipeEnd(offset, velocity)
      }

      // Reset state
      swipe.active = false
      swipe.isSwiping = null
      swipe.drawerHit = false
      setIsSwiping(false)
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, width, x, drawerRef])

  return { isSwiping, setIsSwiping }
}

export default useSidebarSwipe
