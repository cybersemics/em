import { token } from '../../../styled-system/tokens'
import Gesture from '../../@types/Gesture'
import GestureArrowhead from './types/GestureArrowhead'
import GestureGeometry from './types/GestureGeometry'
import GestureSegment from './types/GestureSegment'

type ArcGestureSegment = Extract<GestureSegment, { kind: 'arc' }>

interface SegmentedGradientGestureRendererProps {
  /** Marker style attached to the final rendered segment. */
  arrowhead: GestureArrowhead
  /** Gradient endpoint and highlighted marker fallback. */
  color?: string
  /** Drop-shadow filter applied to the gesture segments. */
  dropShadow?: string
  /** Canonical shape to paint. */
  geometry: GestureGeometry
  /** Number of semantic directions to highlight. */
  highlight?: number
  /** Stable identifier shared by one GestureDiagram instance. */
  instanceId: string
  /** Base gesture stroke width. */
  strokeWidth: number
}

/** Defines the four historical gradients used by the rdld question-mark glyph. */
const MobileCommandUniverseGradients = () => (
  <>
    <radialGradient cx={29.7} cy={13.5} r={33.3} id='rdld-gradient-0' gradientUnits='userSpaceOnUse'>
      <stop offset='0%' className='rdld-gradient-0-start' />
      <stop offset='100%' className='rdld-gradient-0-stop' />
    </radialGradient>
    <linearGradient id='rdld-gradient-1' gradientUnits='userSpaceOnUse'>
      <stop offset='0%' className='rdld-gradient-1-start' />
      <stop offset='100%' className='rdld-gradient-1-stop' />
    </linearGradient>
    <radialGradient cx={54} cy={40.5} r={18.5} id='rdld-gradient-2' gradientUnits='userSpaceOnUse'>
      <stop offset='0%' className='rdld-gradient-2-start' />
      <stop offset='100%' className='rdld-gradient-2-stop' />
    </radialGradient>
    <linearGradient x1={45} y1={58.5} x2={45} y2={72} id='rdld-gradient-3' gradientUnits='userSpaceOnUse'>
      <stop offset='0%' className='rdld-gradient-3-start' />
      <stop offset='100%' className='rdld-gradient-3-stop' />
    </linearGradient>
  </>
)

/** Defines the historical radial gradient used for one rounded arc. */
const ArcGradient = ({
  extendedPath,
  index,
  segment,
}: {
  /** Gesture string used to namespace the legacy gradient. */
  extendedPath: Gesture
  /** Index of this gradient within the gesture. */
  index: number
  /** Circular arc painted by the gradient. */
  segment: ArcGestureSegment
}) => (
  <radialGradient
    cx={segment.from.x}
    cy={segment.from.y}
    r={segment.radius}
    id={`${extendedPath}-gradient-${index}`}
    gradientUnits='userSpaceOnUse'
  >
    <stop offset='0%' className={`${extendedPath}-gradient-${index}-start`} />
    <stop offset='100%' className={`${extendedPath}-gradient-${index}-stop`} />
  </radialGradient>
)

/** Defines the legacy per-segment gradient colors and highlight overrides. */
const GradientStyleBlock = ({
  color,
  highlight,
  path,
}: {
  /** Gradient endpoint. */
  color?: string
  /** Number of semantic directions to highlight. */
  highlight?: number
  /** Extended gesture used to identify each gradient. */
  path: Gesture
}) => {
  const extendedSegmentIndex = path === 'rdl' ? 3 : path === 'ldr' ? 2 : undefined
  // The first segment starts faint, intermediate segments continue at half opacity, and the final segment reaches full opacity.
  const stopColors = Array.from(path).map((_, index) =>
    index === 0 ? 25 : path.length > 2 && index === path.length - 1 ? 75 : 50,
  )

  return (
    <style>
      {stopColors.map((startPercent, index) => {
        const stopPercent = index === path.length - 1 ? 100 : stopColors[index + 1]
        // The synthetic rdl/ldr segment inherits the highlight state of its semantic direction.
        const stopColor =
          highlight != null &&
          (index < highlight ||
            highlight === path.length ||
            (highlight === extendedSegmentIndex && index === extendedSegmentIndex))
            ? token('colors.vividHighlight')
            : color || token('colors.fg')

        return `
          .${path}-gradient-${index}-start { stop-color: color-mix(in srgb, ${stopColor} ${startPercent}%, ${token('colors.bg')}) }
          .${path}-gradient-${index}-stop { stop-color: color-mix(in srgb, ${stopColor} ${stopPercent}%, ${token('colors.bg')}) }
        `
      })}
    </style>
  )
}

/** Serializes one canonical segment as an independently paintable SVG path. */
const serializeSegment = (segment: GestureSegment, path: Gesture) =>
  segment.kind === 'line'
    ? path === 'rdld'
      ? `M ${segment.from.x},${segment.from.y} L ${segment.to.x},${segment.to.y}`
      : `M ${segment.from.x} ${segment.from.y} l ${segment.to.x - segment.from.x} ${segment.to.y - segment.from.y}`
    : segment.kind === 'arc'
      ? `M ${segment.from.x} ${segment.from.y} A ${segment.radius} ${segment.radius} 0 0 ${segment.sweepFlag} ${segment.to.x} ${segment.to.y}`
      : `M ${segment.from.x},${segment.from.y} Q ${segment.control.x},${segment.control.y} ${segment.to.x},${segment.to.y}`

/**
 * Preserves the default gradient treatment used by existing GestureDiagram callers.
 * GestureDiagram selects this renderer when no custom `gradient` prop is supplied.
 * Unlike ContinuousGradientGestureRenderer, each geometry segment restarts its own ramp.
 */
const SegmentedGradientGestureRenderer = ({
  arrowhead,
  color,
  dropShadow,
  geometry,
  highlight,
  instanceId,
  strokeWidth,
}: SegmentedGradientGestureRendererProps) => {
  const { extendedPath, path, segments } = geometry
  const commonPathProps = {
    strokeWidth: strokeWidth * 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
    style: dropShadow ? { filter: dropShadow } : undefined,
  }

  return (
    <>
      <defs>
        {extendedPath === 'rdld' ? (
          <MobileCommandUniverseGradients />
        ) : (
          segments.map((segment, index) =>
            segment.kind === 'arc' ? (
              <ArcGradient key={index} index={index} extendedPath={extendedPath} segment={segment} />
            ) : (
              <linearGradient
                id={`${extendedPath}-gradient-${index}`}
                key={index}
                gradientUnits='userSpaceOnUse'
                x1={segment.from.x}
                x2={segment.to.x}
                y1={segment.from.y}
                y2={segment.to.y}
              >
                <stop offset='0%' className={`${extendedPath}-gradient-${index}-start`} />
                <stop offset='100%' className={`${extendedPath}-gradient-${index}-stop`} />
              </linearGradient>
            ),
          )
        )}
      </defs>
      <GradientStyleBlock color={color} highlight={highlight} path={extendedPath} />
      {segments.map((segment, index) => (
        <path
          d={serializeSegment(segment, path)}
          key={index}
          stroke={`url(#${extendedPath}-gradient-${index})`}
          {...commonPathProps}
          markerEnd={
            index === segments.length - 1 && path !== 'rdld' && arrowhead !== 'none'
              ? `url(#${instanceId}-arrowhead)`
              : undefined
          }
        />
      ))}
    </>
  )
}

export default SegmentedGradientGestureRenderer
