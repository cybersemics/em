import { MotionValue, animate, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import durations from '../../util/durations'

/**
 * The ring's flourish: one spin and a color pulse, played each time `flourish` changes, but never on mount.
 *
 * One timeline, `t` from 0 to 1, drives the whole flourish, so its parts stay in step: the spin is t × 360°, and the
 * color pulse is a bell that peaks at the half turn. If the fill is still short of full when the flourish starts, as
 * it is on the rep that completes the ring, the flourish takes the fill over and closes it during the first half of
 * the turn, so the arc completes at the brightest moment instead of finishing its own tween first.
 *
 * The flourish has to start after the fill has reacted to the same rep, so it can stop the tween the fill has just
 * started. React runs effects in the order the hooks are called, so call useRingFill before this hook.
 *
 * With reduced motion the color pulse still plays, but the ring does not spin.
 */
const useRingFlourish = (
  flourish: number,
  fill: MotionValue<number>,
): { spin: MotionValue<number>; colorPulse: MotionValue<number>; isFlourishing: boolean } => {
  const prefersReducedMotion = useReducedMotion()
  // The flourish timeline, from 0 at the start to 1 at the end.
  const t = useMotionValue(0)
  const spin = useTransform(t, value => (prefersReducedMotion ? 0 : value * 360))
  // How colorful the flourish makes the ring, from 0 (mono) to 1 at the half turn and back to 0.
  const colorPulse = useTransform(t, value => Math.sin(Math.PI * value))
  const [isFlourishing, setIsFlourishing] = useState(false)
  // The flourish count already played, so the value on mount plays nothing.
  const playedFlourish = useRef(flourish)

  useEffect(() => {
    if (flourish === playedFlourish.current) return
    playedFlourish.current = flourish

    fill.stop()
    // The fill the flourish closes from: wherever it is drawn now.
    const from = fill.get()
    setIsFlourishing(true)
    const controls = animate(t, [0, 1], {
      duration: durations.get('slow') / 1000,
      ease: 'easeInOut',
      onUpdate: value => fill.set(from + (1 - from) * Math.min(1, value * 2)),
      onComplete: () => setIsFlourishing(false),
    })
    return () => controls.stop()
  }, [flourish, fill, t])

  return { spin, colorPulse, isFlourishing }
}

export default useRingFlourish
