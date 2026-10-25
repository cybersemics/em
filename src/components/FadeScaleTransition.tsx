import { AnimatePresence, MotionValue, animate, useMotionValue, usePresence, useReducedMotion } from 'motion/react'
import { ReactNode, useEffect, useRef } from 'react'

interface FadeScaleTransitionProps {
  in: boolean
  duration: number
  scaleFrom?: number
  children: (animation: { opacity: MotionValue<number>; scale: MotionValue<number>; isPresent: boolean }) => ReactNode
}

/** Owns animation values until an exiting surface has finished fading. */
const TransitionSurface = ({ duration, scaleFrom = 0.95, children }: Omit<FadeScaleTransitionProps, 'in'>) => {
  const [isPresent, safeToRemove] = usePresence()
  const reducedMotion = useReducedMotion()
  const opacity = useMotionValue(duration === 0 ? 1 : 0)
  const scale = useMotionValue(reducedMotion || duration === 0 ? 1 : scaleFrom)
  const present = useRef(isPresent)
  present.current = isPresent

  useEffect(() => {
    if (duration === 0) {
      opacity.jump(isPresent ? 1 : 0)
      scale.jump(1)
      if (!isPresent) safeToRemove?.()
      return
    }
    const fade = animate(opacity, isPresent ? 1 : 0, { duration })
    const zoom = animate(scale, isPresent || reducedMotion ? 1 : scaleFrom, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
    })
    void fade.then(() => {
      if (!isPresent && !present.current) safeToRemove?.()
    })
    return () => {
      fade.stop()
      zoom.stop()
    }
  }, [duration, isPresent, opacity, reducedMotion, safeToRemove, scale, scaleFrom])

  return children({ opacity, scale, isPresent })
}

/** Coordinates mounting, fading and scaling without imposing an opacity-bearing ancestor on backdrop filters. */
const FadeScaleTransition = ({ in: isOpen, children, ...options }: FadeScaleTransitionProps) => (
  <AnimatePresence>{isOpen && <TransitionSurface {...options}>{children}</TransitionSurface>}</AnimatePresence>
)

export default FadeScaleTransition
