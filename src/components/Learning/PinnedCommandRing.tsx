import { MotionValue, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react'
import { PropsWithChildren, useId, useState } from 'react'
import { css } from '../../../styled-system/css'
import { PINNED_COMMAND_RING_SIZE } from '../../constants'
import ringGeometry from './ringGeometry'
import useRingFill from './useRingFill'
import useRingFlourish from './useRingFlourish'

/**
 * These values are derived directly from the original design in Figma, in a 73×73 box.
 *
 * PinnedCommandRing
 * ├─ RingTrack: dim background circle with its gradient, blur, and shadow.
 * ├─ RingProgress: the fill, colored and spun; useRingFill and useRingFlourish animate it.
 * │  └─ BlurredProgressArc: the gradient arc, split into overlapping blur bands.
 * │     └─ RingBlurBand: the mask and blur for one band of the arc.
 * └─ RingIcon: the command icon centered inside the ring.
 *
 * The arc's blur decreases from tail to head. CSS cannot vary blur along an arc, so the rendering
 * approximates it with overlapping copies of the gradient, each masked to a band and blurred separately.
 * The mask belongs inside the blur wrapper so both the inner and outer edges soften. See docs/learning.md.
 */

const {
  centerX: CENTER_X,
  centerY: CENTER_Y,
  trackRadius: TRACK_RADIUS,
  fillRadius: FILL_RADIUS,
  strokeWidth: STROKE_WIDTH,
} = ringGeometry
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
 * Draws the fill, and colors and spins it. The fill and the flourish are animated by their own hooks: useRingFill
 * tweens the fill to the supplied progress, and useRingFlourish plays the spin and color pulse. The two meet in two
 * places, each visible below: the flourish closes the fill it receives, and the flourish's pulse and the tooltip's
 * `activeOpacity` both color the ring. Remains mounted when progress is zero, so the fill's animation state survives.
 */
const RingProgress = ({ progress, flourish = 0, activeOpacity }: RingProgressProps) => {
  const { fill, drawnProgress } = useRingFill(progress)
  // Called after useRingFill, so the flourish can take over a fill tween started by the same rep.
  const { spin, colorPulse, isFlourishing } = useRingFlourish(flourish, fill)

  // The flourish and the tooltip both color the ring. Whichever is stronger at the moment sets the color.
  const noTooltipColor = useMotionValue(0)
  const tooltipColor = activeOpacity ?? noTooltipColor
  const colorOpacity = useTransform([colorPulse, tooltipColor], ([pulse, tooltip]) =>
    Math.max(pulse as number, tooltip as number),
  )
  const monoOpacity = useTransform(colorOpacity, value => 1 - value)
  // The colorful layers are mounted only while something colors the ring, since each is five blurred bands.
  const [isTooltipColoring, setIsTooltipColoring] = useState(tooltipColor.get() > 0)
  useMotionValueEvent(tooltipColor, 'change', value => setIsTooltipColoring(value > 0))

  return progress > 0 ? (
    // The spin rotates the arcs about the ring center, which is not the box center.
    <motion.div
      className={css({ position: 'absolute', inset: 0, transformOrigin: '36.42px 36.16px' })}
      style={{ rotate: spin }}
    >
      <motion.div
        data-testid='pinned-command-ring-fill'
        data-progress={drawnProgress}
        className={css({ position: 'absolute', inset: 0 })}
        style={{ opacity: monoOpacity }}
      >
        <BlurredProgressArc progress={drawnProgress} stops={STOPS_MONO} />
      </motion.div>
      {(isFlourishing || isTooltipColoring) && (
        <motion.div
          data-testid='pinned-command-ring-colorful-fill'
          className={css({ position: 'absolute', inset: 0 })}
          style={{ opacity: colorOpacity }}
        >
          <BlurredProgressArc progress={drawnProgress} stops={STOPS_COLORFUL} />
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
