import { motion } from 'motion/react'
import { PropsWithChildren, useId } from 'react'
import { css } from '../../../styled-system/css'
import { PINNED_COMMAND_RING_SIZE } from '../../constants'
import durations from '../../util/durations'

/*
 * Geometry and paint values come from the Figma SVG exports of the ring, in a 73×73 box. The track is a plain stroked
 * circle and reproduces the export verbatim. The fill is an annular sector with an along-arc gradient and an angular
 * progressive layer blur (tail σ 7 → head σ 2), which no browser can draw directly; it is approximated by drawing the
 * arc as one conic gradient and stacking a few copies of it, each masked to an angular band with a soft crossfade into
 * its neighbours and each blurred a different amount. See docs/learning.md.
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

/** The progress arc drawn as stacked, band-masked conic gradients with a blur that decreases from tail to head. */
const FillArc = ({ progress, stops }: { progress: number; stops: Stop[] }) => {
  // conic-gradient angles start at 12 o'clock and run clockwise, matching the arc
  const sweep = progress * 360
  const colorStops = stops.map(([offset, color]) => `${color} ${(offset * sweep).toFixed(2)}deg`).join(', ')
  const headColor = stops[stops.length - 1][1]
  const fade = 0.5 / BLUR_LAYERS

  return (
    <>
      {Array.from({ length: BLUR_LAYERS }, (_, i) => {
        const sigma = BLUR_SIGMA_TAIL + (BLUR_SIGMA_HEAD - BLUR_SIGMA_TAIL) * ((i + 0.5) / BLUR_LAYERS)
        // Each band covers 1/BLUR_LAYERS of the arc and crossfades over ±fade into its neighbours so the two ramps
        // sum to full opacity. The first band opens well before the tail and the last closes well after the head, so
        // the arc ends are shaped by the gradient itself rather than cut by the mask.
        const bandStart = i === 0 ? [-1, -0.99] : [i / BLUR_LAYERS - fade, i / BLUR_LAYERS + fade]
        const bandEnd = i === BLUR_LAYERS - 1 ? [2, 3] : [(i + 1) / BLUR_LAYERS - fade, (i + 1) / BLUR_LAYERS + fade]
        const bandMask = `conic-gradient(from 0deg at ${CENTER_X}px ${CENTER_Y}px, transparent ${(bandStart[0] * sweep).toFixed(2)}deg, black ${(bandStart[1] * sweep).toFixed(2)}deg, black ${(bandEnd[0] * sweep).toFixed(2)}deg, transparent ${(bandEnd[1] * sweep).toFixed(2)}deg)`
        const mask = `${ANNULUS_MASK}, ${bandMask}`
        return (
          // the blur is on the wrapper so it applies after the inner element's masks
          <div key={i} className={css({ position: 'absolute', inset: 0 })} style={{ filter: `blur(${sigma}px)` }}>
            <div
              className={css({
                position: 'absolute',
                inset: 0,
                maskComposite: 'intersect',
                WebkitMaskComposite: 'source-in' as string,
              })}
              style={{
                background: `conic-gradient(from 0deg at ${CENTER_X}px ${CENTER_Y}px, ${colorStops}, ${headColor} ${sweep.toFixed(2)}deg, transparent ${sweep.toFixed(2)}deg)`,
                maskImage: mask,
                WebkitMaskImage: mask,
              }}
            />
          </div>
        )
      })}
    </>
  )
}

/**
 * The practice-progress ring around a pinned command. Renders the dim track, the progress arc from 0 to 1, and the
 * children (the command icon) at the center. The arc is mono while practicing and crossfades to the colorful fill when
 * complete; completion is derived by the caller, not stored here.
 */
const PinnedCommandRing = ({
  progress,
  complete,
  children,
}: PropsWithChildren<{
  /** Practice progress from 0 (unstarted) to 1 (target reached). */
  progress: number
  /** Whether the target has been reached. Switches the fill from mono to colorful. */
  complete: boolean
}>) => {
  // filter and gradient ids must be unique when several rings are on one page, e.g. in the snapshot fixture
  const id = useId()
  const colorDuration = durations.get('pinnedCommandComplete') / 1000

  return (
    <div
      className={css({ position: 'relative', flex: 'none' })}
      style={{ width: PINNED_COMMAND_RING_SIZE, height: PINNED_COMMAND_RING_SIZE }}
    >
      {/* Track: the Figma export's stroke, layer blur, drop shadow, opacity and blend mode. */}
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

      {progress > 0 && (
        <>
          <motion.div
            className={css({ position: 'absolute', inset: 0 })}
            animate={{ opacity: complete ? 0 : 1 }}
            transition={{ duration: colorDuration }}
          >
            <FillArc progress={progress} stops={STOPS_MONO} />
          </motion.div>
          {complete && (
            <motion.div
              className={css({ position: 'absolute', inset: 0 })}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: colorDuration }}
            >
              <FillArc progress={progress} stops={STOPS_COLORFUL} />
            </motion.div>
          )}
        </>
      )}

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
    </div>
  )
}

export default PinnedCommandRing
