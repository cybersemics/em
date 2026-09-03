import { useMotionValue } from 'framer-motion'
import { useMemo } from 'react'
import { EASE_OUT, MEDIUM_DURATION } from './constants'

/** Softer ease-out used when *closing* the sidebar. The less aggressive start prevents the
 * drawer from appearing to "jump" when the user releases a swipe. */
const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

/**
 * The drawer's position over time: where it sits (`x`) and how it gets there (`transition`).
 *
 * `x` is a MotionValue rather than React state because `useSidebarSwipe` writes into it
 * directly on every touchmove, at frame rate, without triggering a re-render. This hook is
 * `x`'s owner and the source of the declarative open/close animation; the swipe hook is just
 * a writer holding the same reference, moving the same value a different way.
 */
const useDrawerPosition = (showSidebar: boolean, width: number) => {
  /** 0 = fully open, -width = fully closed (off-screen to the left). */
  const x = useMotionValue(showSidebar ? 0 : -width)

  /** The open/close transition. Opening is snappier; closing is gentler so a released swipe
   * doesn't look like it "jumps". */
  const transition = useMemo(
    () => ({
      duration: MEDIUM_DURATION,
      ease: showSidebar ? EASE_OUT : EASE_OUT_GENTLE,
    }),
    [showSidebar],
  )

  return { x, transition }
}

export default useDrawerPosition
