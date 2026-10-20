import { MotionValue, animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import durations from '../../util/durations'

/**
 * The ring's fill: how much of the arc is drawn, animated from its current angle to the supplied progress.
 *
 * The arc's end angle is written into conic-gradient strings (see BlurredProgressArc and RingBlurBand). Browsers cannot
 * transition between two gradient strings, so CSS cannot animate the fill. Instead, Motion tweens `fill`, a
 * MotionValue, and every change is copied into `drawnProgress` state, which re-renders the gradients at that angle.
 *
 * `fill` is the single source of the drawn angle. Motion always tweens a MotionValue from its current value, so a rep
 * that arrives mid-animation continues from the visible angle rather than restarting the arc, and starting a new tween
 * stops the previous one. With reduced motion, the fill jumps to the new progress.
 *
 * This hook owns `fill`. The flourish also writes to it while it plays (see useRingFlourish), the same way the
 * Sidebar's swipe hook writes to the drawer position that useDrawerPosition owns.
 */
const useRingFill = (progress: number): { fill: MotionValue<number>; drawnProgress: number } => {
  const prefersReducedMotion = useReducedMotion()
  const fill = useMotionValue(progress)
  // The progress currently drawn, which trails `progress` while a tween is running.
  const [drawnProgress, setDrawnProgress] = useState(progress)
  useMotionValueEvent(fill, 'change', setDrawnProgress)

  useEffect(() => {
    if (prefersReducedMotion) {
      fill.jump(progress)
      return
    }
    const controls = animate(fill, progress, { duration: durations.get('medium') / 1000 })
    return () => controls.stop()
  }, [fill, progress, prefersReducedMotion])

  return {
    fill,
    // Reduced motion draws the target directly, even on the render before the effect has jumped `fill` to it.
    drawnProgress: prefersReducedMotion ? progress : drawnProgress,
  }
}

export default useRingFill
