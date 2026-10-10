import {
  MotionValue,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import { PropsWithChildren, useCallback, useEffect, useId, useRef, useState } from 'react'
import { css } from '../../../styled-system/css'
import { PINNED_COMMAND_RING_SIZE } from '../../constants'
import durations from '../../util/durations'

/**
 * These values are derived directly from the original design in Figma, in a 73×73 box.
 *
 * PinnedCommandRing
 * ├─ RingTrack: dim background circle with its gradient, blur, and shadow.
 * ├─ RingProgress: animated fill, color, and flourish.
 * │  └─ BlurredProgressArc: the gradient arc, split into overlapping blur bands.
 * │     └─ RingBlurBand: the mask and blur for one band of the arc.
 * └─ RingIcon: the command icon centered inside the ring.
 *
 * The arc's blur decreases from tail to head. CSS cannot vary blur along an arc, so the rendering
 * approximates it with overlapping copies of the gradient, each masked to a band and blurred separately.
 * The mask belongs inside the blur wrapper so both the inner and outer edges soften. See docs/learning.md.
 */

const CENTER_X = 36.42
const CENTER_Y = 36.16
const TRACK_RADIUS = 17.95
const FILL_RADIUS = 19.71
const STROKE_WIDTH = 6
/** Number of blurred bands the fill arc is split into. Five is visually smooth; fewer shows steps in the blur. */
const BLUR_LAYERS = 5
const BLUR_SIGMA_TAIL = 7
const BLUR_SIGMA_HEAD = 2

/** Along-arc gradient stops as [offset, color]: offset 0 is the tail at 12 o'clock and 1 is the head. */
type Stop = [offset: number, color: string]
const STOPS_MONO: Stop[] = [
  [0, 'rgba(16, 15, 19, 0.87)'],
  [0.0577, 'rgba(61, 61, 61, 1)'],
  [0.399, 'rgba(131, 131, 131, 1)'],
  [0.611, 'rgba(130, 130, 130, 0.9)'],
  [0.803, 'rgba(125, 125, 125, 0.91)'],
  [0.976, 'rgba(141, 141, 141, 1)'],
]
const STOPS_COLORFUL: Stop[] = [
  [0, 'rgba(35, 20, 73, 0.87)'],
  [0.0577, 'rgba(216, 103, 103, 0.5)'],
  [0.399, 'rgba(255, 166, 166, 0.6)'],
  [0.611, 'rgba(255, 201, 201, 1)'],
  [0.803, 'rgba(255, 215, 215, 1)'],
  [0.976, 'rgba(255, 237, 231, 1)'],
]

/** Restricts a layer to the ring's annulus. Applied before the layer's blur, so the blur softens the ring edges. */
const ANNULUS_MASK = `radial-gradient(circle at ${CENTER_X}px ${CENTER_Y}px, transparent ${FILL_RADIUS - STROKE_WIDTH / 2 - 0.3}px, black ${FILL_RADIUS - STROKE_WIDTH / 2}px, black ${FILL_RADIUS + STROKE_WIDTH / 2}px, transparent ${FILL_RADIUS + STROKE_WIDTH / 2 + 0.3}px)`

interface RingProgressProps {
  /** Practice progress from 0 (unstarted) to 1 (target reached). */
  progress: number
  /** Increment to play the flourish. Only changes matter; the initial value plays nothing. */
  flourish?: number
  /** Visibility of the colorful fill, from 0 (mono) to 1 (fully colorful). */
  activeOpacity?: MotionValue<number>
}

/** Draws the stationary background circle with its gradient, blur, and shadow. */
const RingTrack = () => {
  // Each ring needs unique filter and gradient IDs, including rings rendered together in a fixture.
  const id = useId()

  return (
    <svg
      viewBox={`0 0 ${PINNED_COMMAND_RING_SIZE} ${PINNED_COMMAND_RING_SIZE}`}
      className={css({ position: 'absolute', inset: 0, overflow: 'visible' })}
      aria-hidden='true'
    >
      <defs>
        <filter id={`${id}-track`} x='-50%' y='-50%' width='200%' height='200%' colorInterpolationFilters='sRGB'>
          <feGaussianBlur in='SourceAlpha' stdDeviation='7.73333' />
          <feColorMatrix
            type='matrix'
            values='0 0 0 0 0.73419 0 0 0 0 0.73419 0 0 0 0 0.73419 0 0 0 0.5 0'
            result='shadow'
          />
          <feBlend mode='normal' in='SourceGraphic' in2='shadow' result='shape' />
          <feGaussianBlur in='shape' stdDeviation='4.2' />
        </filter>
        <linearGradient
          id={`${id}-track-gradient`}
          x1='6.916'
          y1='54.165'
          x2='88.916'
          y2='-2.835'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0.129824' stopColor='#CECECE' stopOpacity='0.57' />
          <stop offset='0.365404' stopColor='#878787' stopOpacity='0.32' />
          <stop offset='0.778871' stopColor='white' />
        </linearGradient>
      </defs>
      <g opacity='0.52' filter={`url(#${id}-track)`} style={{ mixBlendMode: 'hard-light' }}>
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={TRACK_RADIUS}
          fill='none'
          stroke={`url(#${id}-track-gradient)`}
          strokeWidth={STROKE_WIDTH}
        />
      </g>
    </svg>
  )
}

/** Paints one band of the arc, applying its blur after masking the gradient to the ring. */
const RingBlurBand = ({ index, sweep, background }: { index: number; sweep: number; background: string }) => {
  const sigma = BLUR_SIGMA_TAIL + (BLUR_SIGMA_HEAD - BLUR_SIGMA_TAIL) * ((index + 0.5) / BLUR_LAYERS)
  const fade = 0.5 / BLUR_LAYERS
  // Adjacent bands overlap and crossfade so their opacity sums to one. The first and last masks extend beyond
  // the arc; the gradient itself defines the endpoints, avoiding a hard cut through the blur.
  const bandStart = index === 0 ? [-1, -0.99] : [index / BLUR_LAYERS - fade, index / BLUR_LAYERS + fade]
  const bandEnd =
    index === BLUR_LAYERS - 1 ? [2, 3] : [(index + 1) / BLUR_LAYERS - fade, (index + 1) / BLUR_LAYERS + fade]
  const bandMask = `conic-gradient(from 0deg at ${CENTER_X}px ${CENTER_Y}px, transparent ${(bandStart[0] * sweep).toFixed(2)}deg, black ${(bandStart[1] * sweep).toFixed(2)}deg, black ${(bandEnd[0] * sweep).toFixed(2)}deg, transparent ${(bandEnd[1] * sweep).toFixed(2)}deg)`
  const mask = `${ANNULUS_MASK}, ${bandMask}`

  return (
    <div className={css({ position: 'absolute', inset: 0 })} style={{ filter: `blur(${sigma}px)` }}>
      <div
        className={css({
          position: 'absolute',
          inset: 0,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in' as string,
        })}
        style={{ background, maskImage: mask, WebkitMaskImage: mask }}
      />
    </div>
  )
}

/** Paints a progress arc whose gradient and blur follow the arc from its tail to its head. */
const BlurredProgressArc = ({ progress, stops }: { progress: number; stops: Stop[] }) => {
  // Conic gradients start at 12 o'clock and run clockwise, matching the ring's progress direction.
  const sweep = progress * 360
  const colorStops = stops.map(([offset, color]) => `${color} ${(offset * sweep).toFixed(2)}deg`).join(', ')
  const headColor = stops[stops.length - 1][1]
  const background = `conic-gradient(from 0deg at ${CENTER_X}px ${CENTER_Y}px, ${colorStops}, ${headColor} ${sweep.toFixed(2)}deg, transparent ${sweep.toFixed(2)}deg)`

  return (
    <>
      {Array.from({ length: BLUR_LAYERS }, (_, index) => (
        <RingBlurBand key={index} index={index} sweep={sweep} background={background} />
      ))}
    </>
  )
}

/**
 * Controls the visible fill, color, and spin. A flourish takes over the fill animation until it finishes,
 * allowing the completing rep to flow straight into the celebration. Remains mounted when progress is zero.
 */
const RingProgress = ({ progress, flourish = 0, activeOpacity }: RingProgressProps) => {
  const prefersReducedMotion = useReducedMotion()
  const [renderedProgress, setRenderedProgress] = useState(progress)
  const currentProgress = useRef(progress)
  const visibleProgress = prefersReducedMotion ? progress : renderedProgress
  const [isFlourishing, setIsFlourishing] = useState(false)
  const previousFlourish = useRef(flourish)
  const fillAnimation = useRef<{ stop: () => void } | null>(null)
  // While a flourish plays it drives the fill, so the fill effect must not start a competing animation.
  const flourishOwnsFill = useRef(false)
  const flourishAnimation = useRef<{ stop: () => void } | null>(null)
  // One master timeline drives the whole flourish, so the spin, the color, and the last segment of the fill are
  // always in step: rotation is t × 360°, color is a bell that peaks at the half turn, and a fill that was still
  // short of full closes over the first half so the arc completes at the brightest moment.
  const flourishT = useMotionValue(0)
  const spin = useTransform(flourishT, value => (prefersReducedMotion ? 0 : value * 360))
  const flourishColorOpacity = useTransform(flourishT, value => Math.sin(Math.PI * value))
  const inactiveOpacity = useMotionValue(0)
  const activeColorOpacity = activeOpacity ?? inactiveOpacity
  const [isActiveColor, setIsActiveColor] = useState(activeColorOpacity.get() > 0)
  const colorOpacity = useTransform([flourishColorOpacity, activeColorOpacity], ([flourishColor, tooltipColor]) =>
    Math.max(flourishColor as number, tooltipColor as number),
  )
  const monoOpacity = useTransform(colorOpacity, value => 1 - value)

  useMotionValueEvent(activeColorOpacity, 'change', value => setIsActiveColor(value > 0))

  /** Plays the flourish from wherever the fill currently is, taking over any fill animation in progress. */
  const startFlourish = useCallback(() => {
    fillAnimation.current?.stop()
    flourishAnimation.current?.stop()
    const from = currentProgress.current
    flourishT.set(0)
    flourishOwnsFill.current = true
    setIsFlourishing(true)
    flourishAnimation.current = animate(flourishT, [0, 1], {
      duration: durations.get('pinnedCommandFlourish') / 1000,
      ease: 'easeInOut',
      onUpdate: value => {
        // Close the remaining fill over the first half of the turn.
        const fill = from + (1 - from) * Math.min(1, value * 2)
        currentProgress.current = fill
        setRenderedProgress(fill)
      },
      onComplete: () => {
        currentProgress.current = 1
        setRenderedProgress(1)
        flourishOwnsFill.current = false
        setIsFlourishing(false)
      },
    })
  }, [flourishT])

  useEffect(() => {
    if (flourish === previousFlourish.current) return
    previousFlourish.current = flourish
    startFlourish()
  }, [flourish, startFlourish])

  useEffect(() => {
    // A flourish owns the fill while it plays; the completing rep changes progress and flourish together.
    if (flourishOwnsFill.current) return
    if (prefersReducedMotion || currentProgress.current === progress) {
      currentProgress.current = progress
      setRenderedProgress(progress)
      return
    }

    // Start from the visible angle so consecutive reps never jump backwards or restart the arc.
    const animation = animate(currentProgress.current, progress, {
      duration: durations.get('medium') / 1000,
      onUpdate: value => {
        currentProgress.current = value
        setRenderedProgress(value)
      },
    })
    fillAnimation.current = animation
    return () => animation.stop()
  }, [progress, prefersReducedMotion])

  useEffect(() => () => flourishAnimation.current?.stop(), [])

  return progress > 0 ? (
    // The spin rotates the arcs about the ring center, which is not the box center.
    <motion.div
      className={css({ position: 'absolute', inset: 0, transformOrigin: '36.42px 36.16px' })}
      style={{ rotate: spin }}
    >
      <motion.div className={css({ position: 'absolute', inset: 0 })} style={{ opacity: monoOpacity }}>
        <BlurredProgressArc progress={visibleProgress} stops={STOPS_MONO} />
      </motion.div>
      {(isFlourishing || isActiveColor) && (
        <motion.div className={css({ position: 'absolute', inset: 0 })} style={{ opacity: colorOpacity }}>
          <BlurredProgressArc progress={visibleProgress} stops={STOPS_COLORFUL} />
        </motion.div>
      )}
    </motion.div>
  ) : null
}

/** Centers the supplied command icon without changing the ring's geometry. */
const RingIcon = ({ children }: PropsWithChildren) => (
  <div
    className={css({
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    })}
  >
    {children}
  </div>
)

/** Composes the background track, animated progress, and centered command icon. */
const PinnedCommandRing = ({ children, ...progressProps }: PropsWithChildren<RingProgressProps>) => (
  <div
    className={css({ position: 'relative', flex: 'none' })}
    style={{ width: PINNED_COMMAND_RING_SIZE, height: PINNED_COMMAND_RING_SIZE }}
  >
    <RingTrack />
    <RingProgress {...progressProps} />
    <RingIcon>{children}</RingIcon>
  </div>
)

export default PinnedCommandRing
