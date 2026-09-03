import { token } from '../../../styled-system/tokens'
import serializeGesturePath from './serializeGesturePath'
import GestureArrowhead from './types/GestureArrowhead'
import GestureGeometry from './types/GestureGeometry'
import GestureGradient from './types/GestureGradient'
import GesturePoint from './types/GesturePoint'
import GestureSegment from './types/GestureSegment'

type QuadraticGestureSegment = Extract<GestureSegment, { kind: 'quadratic' }>

interface ContinuousGradientGestureRendererProps {
  /** Marker style attached to the final rendered piece. */
  arrowhead: GestureArrowhead
  /** Drop-shadow filter applied to the complete gesture. */
  dropShadow?: string
  /** Canonical shape to paint. */
  geometry: GestureGeometry
  /** Colors and extent of the path-length gradient. */
  gradient: GestureGradient
  /** Number of semantic directions to paint with the highlight color. */
  highlight?: number
  /** Color of highlighted directions. */
  highlightColor?: string
  /** Stable identifier shared by one GestureDiagram instance. */
  instanceId: string
  /** Base gesture stroke width. */
  strokeWidth: number
}

interface StrokePiece {
  /** Endpoints of this short linear approximation. */
  points: readonly [GesturePoint, GesturePoint]
  /** Normalized distance at the beginning of the piece. */
  start: number
  /** Normalized distance at the end of the piece. */
  end: number
}

interface StrokeRamp {
  /** Color at the beginning of the ramp. */
  from: string
  /** Color at the end of the ramp. */
  to: string
  /** Percentage held at the start color. */
  startOffset: number
  /** Percentage at which the end color is reached. */
  endOffset: number
}

const ARC_SAMPLES_PER_QUARTER = 16
const QUADRATIC_SAMPLES = 24

/** Returns points along a quadratic Bézier, excluding its start and including its end. */
const sampleQuadratic = (segment: QuadraticGestureSegment, count: number): GesturePoint[] =>
  Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / count
    const remaining = 1 - t
    return {
      x: remaining * remaining * segment.from.x + 2 * remaining * t * segment.control.x + t * t * segment.to.x,
      y: remaining * remaining * segment.from.y + 2 * remaining * t * segment.control.y + t * t * segment.to.y,
    }
  })

/** Approximates one canonical segment as ordered points after its starting point. */
const flattenSegment = (segment: GestureSegment): GesturePoint[] => {
  if (segment.kind === 'line') return [segment.to]
  if (segment.kind === 'quadratic') return sampleQuadratic(segment, QUADRATIC_SAMPLES)

  const sweep = segment.endAngle - segment.startAngle
  const count = Math.max(Math.ceil((Math.abs(sweep) / 90) * ARC_SAMPLES_PER_QUARTER), 1)
  return Array.from({ length: count }, (_, index) => {
    const radians = ((segment.startAngle + (sweep * (index + 1)) / count) * Math.PI) / 180
    return {
      x: segment.center.x + segment.radius * Math.cos(radians),
      y: segment.center.y + segment.radius * Math.sin(radians),
    }
  })
}

/** Approximates canonical gesture geometry as one ordered polyline. */
const flattenGestureGeometry = (geometry: GestureGeometry): GesturePoint[] => [
  geometry.segments[0].from,
  ...geometry.segments.flatMap(flattenSegment),
]

/** Serializes an ordered pair of points as a short SVG path. */
const serializePiece = (points: readonly GesturePoint[]) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

/** Divides a polyline into pieces annotated with cumulative path distance. */
const measureStrokePieces = (samples: readonly GesturePoint[]): StrokePiece[] => {
  // Repeated points have zero length and cannot define a useful linear gradient direction.
  const points = samples.filter(
    (point, index) => index === 0 || point.x !== samples[index - 1].x || point.y !== samples[index - 1].y,
  )
  const cumulative = points.reduce<number[]>(
    (lengths, point, index) => [
      ...lengths,
      index === 0 ? 0 : lengths[index - 1] + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y),
    ],
    [],
  )
  const length = cumulative.at(-1) ?? 0
  return length === 0
    ? []
    : points.slice(1).map((point, index) => ({
        points: [points[index], point],
        start: cumulative[index] / length,
        end: cumulative[index + 1] / length,
      }))
}

/** Returns the percentage of the end color at one normalized path distance. */
const getRampMix = ({ startOffset, endOffset }: StrokeRamp, fraction: number) => {
  const span = Math.max(endOffset - startOffset, 1e-6)
  const mix = Math.min(Math.max((fraction * 100 - startOffset) / span, 0), 1)
  return Math.round(mix * 10000) / 100
}

/** Mixes a percentage of the end color into the start color. */
const mixColors = (from: string, to: string, percent: number) => `color-mix(in srgb, ${to} ${percent}%, ${from})`

/** Returns a color with its alpha forced to one. */
const opaque = (color: string) => `rgb(from ${color} r g b / 1)`

/** Returns an opaque gray whose luminance equals the source color's alpha. */
const alphaAsLuminance = (color: string) => `color(from ${color} srgb alpha alpha alpha / 1)`

/** Returns the two gradient colors of a stroke piece in color or alpha-mask form. */
const getRampStops = (ramp: StrokeRamp, piece: StrokePiece, form: 'color' | 'alpha') => {
  const convert = form === 'color' ? opaque : alphaAsLuminance
  return [
    mixColors(convert(ramp.from), convert(ramp.to), getRampMix(ramp, piece.start)),
    mixColors(convert(ramp.from), convert(ramp.to), getRampMix(ramp, piece.end)),
  ]
}

/**
 * Paints an explicit custom gradient continuously by total path distance.
 * GestureDiagram selects this renderer only when a caller supplies the `gradient` prop.
 * Unlike SegmentedGradientGestureRenderer, turns do not restart the color ramp.
 */
const ContinuousGradientGestureRenderer = ({
  arrowhead,
  dropShadow,
  geometry,
  gradient,
  highlight,
  highlightColor,
  instanceId,
  strokeWidth,
}: ContinuousGradientGestureRendererProps) => {
  const pieces = measureStrokePieces(flattenGestureGeometry(geometry))
  const ramp: StrokeRamp = {
    from: gradient.from,
    to: gradient.to,
    startOffset: gradient.startOffset ?? 0,
    endOffset: gradient.endOffset ?? 100,
  }
  const pathProps = {
    strokeWidth: strokeWidth * 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  }
  const markerEnd =
    geometry.path !== 'rdld' && arrowhead !== 'none' && pieces.length ? `url(#${instanceId}-arrowhead)` : undefined

  /** Defines one local gradient along a short stroke piece. */
  const renderGradient = (piece: StrokePiece, index: number, form: 'color' | 'alpha') => {
    const [first, last] = piece.points
    const [start, end] = getRampStops(ramp, piece, form)
    return (
      <linearGradient
        key={`${form}-${index}`}
        id={`${instanceId}-piece-${index}-${form}`}
        gradientUnits='userSpaceOnUse'
        x1={first.x}
        y1={first.y}
        x2={last.x}
        y2={last.y}
      >
        <stop offset='0%' style={{ stopColor: start }} />
        <stop offset='100%' style={{ stopColor: end }} />
      </linearGradient>
    )
  }

  /** Paints every stroke piece in either visible color or alpha-mask form. */
  const renderStrokes = (form: 'color' | 'alpha') => (
    <>
      {pieces.map((piece, index) => (
        <path
          key={index}
          d={serializePiece(piece.points)}
          stroke={`url(#${instanceId}-piece-${index}-${form})`}
          markerEnd={form === 'color' && index === pieces.length - 1 ? markerEnd : undefined}
          {...pathProps}
        />
      ))}
    </>
  )

  const highlightedSegments =
    highlight == null ? [] : geometry.segments.filter(segment => segment.gestureIndex < highlight)
  const highlightPath = highlightedSegments.length ? serializeGesturePath(highlightedSegments) : null

  return (
    <g style={dropShadow ? { filter: dropShadow } : undefined}>
      <defs>
        {pieces.map((piece, index) => renderGradient(piece, index, 'color'))}
        {pieces.map((piece, index) => renderGradient(piece, index, 'alpha'))}
        {/* The mask preserves the requested alpha where rounded piece caps overlap. */}
        <mask
          id={`${instanceId}-alpha`}
          maskUnits='userSpaceOnUse'
          x={-1e4}
          y={-1e4}
          width={2e4}
          height={2e4}
          style={{ maskType: 'luminance', colorInterpolation: 'sRGB' }}
        >
          {renderStrokes('alpha')}
        </mask>
      </defs>
      <g mask={`url(#${instanceId}-alpha)`}>{renderStrokes('color')}</g>
      {highlightPath && (
        <path d={highlightPath} stroke={highlightColor ?? token('colors.vividHighlight')} {...pathProps} />
      )}
    </g>
  )
}

export default ContinuousGradientGestureRenderer
