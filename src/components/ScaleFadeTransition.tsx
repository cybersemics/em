import { AnimatePresence, MotionValue, animate, useMotionValue, usePresence, useReducedMotion } from 'motion/react'
import { ReactNode, useEffect, useRef } from 'react'

/** The scale the surface grows from as it fades in, and shrinks back to as it fades out. */
const SCALE_FROM = 0.95

interface ScaleFadeTransitionProps {
  in: boolean
  duration: number
  children: (animation: { opacity: MotionValue<number>; scale: MotionValue<number>; isPresent: boolean }) => ReactNode
}

/** Owns animation values until an exiting surface has finished fading. */
const TransitionSurface = ({ duration, children }: Omit<ScaleFadeTransitionProps, 'in'>) => {
  const [isPresent, safeToRemove] = usePresence()
  const reducedMotion = useReducedMotion()
  const opacity = useMotionValue(duration === 0 ? 1 : 0)
  const scale = useMotionValue(reducedMotion || duration === 0 ? 1 : SCALE_FROM)
  const present = useRef(isPresent)
  present.current = isPresent

  useEffect(() => {
    if (duration === 0) {
      opacity.jump(isPresent ? 1 : 0)
      scale.jump(1)
      if (!isPresent) safeToRemove?.()
      return
    }
    let fade: ReturnType<typeof animate> | undefined
    let zoom: ReturnType<typeof animate> | undefined
    /** Starts the fade and the zoom. */
    const start = () => {
      fade = animate(opacity, isPresent ? 1 : 0, { duration })
      zoom = animate(scale, isPresent || reducedMotion ? 1 : SCALE_FROM, {
        duration,
        ease: [0.2, 0.8, 0.2, 1],
      })
      void fade.then(() => {
        if (!isPresent && !present.current) safeToRemove?.()
      })
    }
    // Opening waits two frames, so the work of mounting the surface lands while it is still invisible. Started at
    // once, the animation's clock ran through that stall and the first frame drawn was already a third of the way in.
    let frame = 0
    if (isPresent) frame = requestAnimationFrame(() => (frame = requestAnimationFrame(start)))
    else start()
    return () => {
      cancelAnimationFrame(frame)
      fade?.stop()
      zoom?.stop()
    }
  }, [duration, isPresent, opacity, reducedMotion, safeToRemove, scale])

  return children({ opacity, scale, isPresent })
}

/** Coordinates mounting, fading and scaling without imposing an opacity-bearing ancestor on backdrop filters. */
const ScaleFadeTransition = ({ in: isOpen, children, ...options }: ScaleFadeTransitionProps) => (
  <AnimatePresence>{isOpen && <TransitionSurface {...options}>{children}</TransitionSurface>}</AnimatePresence>
)

export default ScaleFadeTransition
