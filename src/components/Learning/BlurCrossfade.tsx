import { MotionValue, motion, useTransform } from 'motion/react'
import { PropsWithChildren } from 'react'
import { css } from '../../../styled-system/css'

/**
 * Brings its children into focus, or out of it, without animating a blur. It draws them twice, sharp and blurred, and
 * fades between the two: `sharpness` is how much of the sharp copy shows, from 0 to 1, and `visibility` how much of
 * either. Animating a CSS blur re-renders the blur every frame, which WebKit does unevenly, letting it snap from blurred
 * to sharp between two frames and leaving seams at the edges of the blurred box; fading between two fixed copies only
 * changes their opacity, which the GPU composites smoothly. The blurred copy reaches `bleed` px past the children on
 * every side, so its blur, and any glow on the text, is not cut off at their edges.
 */
const BlurCrossfade = ({
  sharpness,
  visibility = 1,
  blur,
  bleed = 0,
  children,
}: PropsWithChildren<{
  sharpness: MotionValue<number>
  visibility?: MotionValue<number> | number
  /** The blur of the blurred copy, in px. */
  blur: number
  bleed?: number
}>) => {
  const shown = typeof visibility === 'number' ? null : visibility
  const sharp = useTransform(() => sharpness.get() * (shown ? shown.get() : (visibility as number)))
  const blurred = useTransform(() => (1 - sharpness.get()) * (shown ? shown.get() : (visibility as number)))
  return (
    // Its own formatting context, so the copies' margins cannot collapse through it.
    <div className={css({ position: 'relative', display: 'flow-root' })}>
      <motion.div style={{ opacity: sharp }}>{children}</motion.div>
      <motion.div
        aria-hidden
        style={{ opacity: blurred, filter: `blur(${blur}px)`, inset: -bleed, padding: bleed }}
        className={css({ position: 'absolute', pointerEvents: 'none' })}
      >
        {children}
      </motion.div>
    </div>
  )
}

export default BlurCrossfade
