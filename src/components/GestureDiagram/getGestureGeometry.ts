import Direction from '../../@types/Direction'
import Gesture from '../../@types/Gesture'
import GestureGeometry from './types/GestureGeometry'
import GesturePoint from './types/GesturePoint'
import GestureSegment from './types/GestureSegment'

type LineGestureSegment = Extract<GestureSegment, { kind: 'line' }>
type ArcGestureSegment = Extract<GestureSegment, { kind: 'arc' }>

/** Returns the direction resulting from a 90 degree clockwise rotation. */
const rotateClockwise = (dir: Direction) =>
  ({
    l: 'u',
    r: 'd',
    u: 'r',
    d: 'l',
  })[dir]

/** Returns the opposite direction of the given direction l/r/d/u. */
const oppositeDirection = (dir: Direction) =>
  ({
    l: 'r',
    r: 'l',
    u: 'd',
    d: 'u',
  })[dir]

/** Calculates the coordinates for a curved segment that can be consumed by other functions. */
const generateArcCoordinates = (index: number, pathDirs: Direction[], size: number) => {
  const radius = size * 0.4
  const center = { x: 50, y: 50 }

  /** Determine base angle based on first direction and second direction. */
  const getBaseAngle = (first: Direction, second: Direction): number => {
    if (first === 'l' || first === 'r') {
      return second === 'u' ? 90 : -90
    } else {
      return second === 'r' ? 0 : 180
    }
  }

  const clockwise = rotateClockwise(pathDirs[0]) === pathDirs[1]
  const sweepFlag = clockwise ? 1 : 0
  const baseAngle = getBaseAngle(pathDirs[0], pathDirs[1])
  const totalAngle = (pathDirs.length - 1) * (clockwise ? 90 : -90)
  const segmentAngle = totalAngle / pathDirs.length
  const [startAngle, endAngle] = [baseAngle + index * segmentAngle, baseAngle + (index + 1) * segmentAngle]
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180

  return {
    startX: center.x + radius * Math.cos(startRad),
    startY: center.y + radius * Math.sin(startRad),
    radius,
    sweepFlag,
    endX: center.x + radius * Math.cos(endRad),
    endY: center.y + radius * Math.sin(endRad),
    startAngle,
    endAngle,
    center,
  }
}

// The 4 custom segments for the rdld (Command Universe) question-mark gesture.
const RDLD_SEGMENTS: readonly GestureSegment[] = [
  {
    kind: 'quadratic',
    from: { x: 29.7, y: 13.5 },
    control: { x: 46.8, y: -4.5 },
    to: { x: 63, y: 13.5 },
    gestureIndex: 0,
  },
  {
    kind: 'quadratic',
    from: { x: 63, y: 13.5 },
    control: { x: 72, y: 27 },
    to: { x: 54, y: 40.5 },
    gestureIndex: 1,
  },
  {
    kind: 'quadratic',
    from: { x: 54, y: 40.5 },
    control: { x: 45, y: 49.5 },
    to: { x: 45, y: 58.5 },
    gestureIndex: 2,
  },
  { kind: 'line', from: { x: 45, y: 58.5 }, to: { x: 45, y: 72 }, gestureIndex: 3 },
]

type BaseGestureGeometry = Omit<GestureGeometry, 'chevron'>

/** Converts a gesture into its unadorned line, arc, or quadratic segments. */
const getBaseGestureGeometry = (
  path: Gesture,
  {
    reversalOffset,
    rounded,
    size,
  }: {
    reversalOffset: number
    rounded?: boolean
    size: number
  },
): BaseGestureGeometry => {
  if (path === 'rdld') return { path, extendedPath: path, segments: RDLD_SEGMENTS }

  if (rounded) {
    const directions = Array.from(path) as Direction[]
    const segments = directions.map<ArcGestureSegment>((_, gestureIndex) => {
      const { startX, startY, radius, sweepFlag, endX, endY, startAngle, endAngle, center } = generateArcCoordinates(
        gestureIndex,
        directions,
        size,
      )
      return {
        kind: 'arc',
        from: { x: startX, y: startY },
        to: { x: endX, y: endY },
        center,
        radius,
        startAngle,
        endAngle,
        sweepFlag: sweepFlag as 0 | 1,
        gestureIndex,
      }
    })
    return { path, extendedPath: path, segments }
  }

  const extendedPath: Gesture = path === 'rdl' ? 'rddl' : path === 'ldr' ? 'lddr' : path
  const directions = Array.from(extendedPath) as Direction[]
  const gestureIndexes =
    path === 'rdl' || path === 'ldr' ? [0, 1, 1, 2] : directions.map((_, gestureIndex) => gestureIndex)

  /** Calculates one pre-scale displacement using the existing reversal rules. */
  const getDelta = (dir: Direction, i: number) => {
    const beforePrev = directions[i - 2]
    const prev = directions[i - 1]
    const next = directions[i + 1]
    const afterNext = directions[i + 2]
    const horizontal = dir === 'l' || dir === 'r'
    const negative = dir === 'l' || dir === 'd'
    const clockwisePrev = rotateClockwise(prev) === dir
    const clockwiseAfterNext = rotateClockwise(next) === afterNext
    const reversal = i < directions.length - 1 && next === oppositeDirection(dir) && afterNext !== dir
    const shorten =
      (i > 1 && prev === oppositeDirection(beforePrev)) ||
      (i < directions.length - 2 && next === oppositeDirection(afterNext))
        ? reversalOffset
        : 0
    const flipOffset =
      (i < directions.length - 2 && !negative === clockwiseAfterNext) || (i > 0 && !negative === clockwisePrev)
    return {
      dx: horizontal ? (size - shorten) * (negative ? -1 : 1) : (reversal ? reversalOffset : 0) * (flipOffset ? -1 : 1),
      dy: !horizontal
        ? (size - shorten) * (!negative ? -1 : 1)
        : (reversal ? reversalOffset : 0) * (flipOffset ? -1 : 1),
    }
  }

  const deltas = directions.map(getDelta)
  const sumWidth = Math.abs(deltas.reduce((sum, delta) => sum + delta.dx, 0))
  const sumHeight = Math.abs(deltas.reduce((sum, delta) => sum + delta.dy, 0))
  const scale = size / Math.max(size, sumWidth, sumHeight)
  const points = deltas.reduce<GesturePoint[]>(
    (positions, delta) => {
      const previous = positions[positions.length - 1]
      return [...positions, { x: previous.x + delta.dx * scale, y: previous.y + delta.dy * scale }]
    },
    [{ x: 0, y: 0 }],
  )

  const finalPoint = points[points.length - 1]
  if (points.slice(0, -1).some(point => point.x === finalPoint.x && point.y === finalPoint.y)) {
    const previous = points[points.length - 2]
    points[points.length - 1] = {
      x: previous.x + (finalPoint.x - previous.x) * 0.6,
      y: previous.y + (finalPoint.y - previous.y) * 0.6,
    }
  }

  const segments = points.slice(1).map<LineGestureSegment>((to, i) => ({
    kind: 'line',
    from: points[i],
    to,
    gestureIndex: gestureIndexes[i],
  }))
  return { path, extendedPath, segments }
}

/** Returns a point a limited distance from the first point toward the second. */
const pointTowards = (from: GesturePoint, to: GesturePoint, distance: number): GesturePoint => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  // Limiting the offset to half the segment prevents neighboring corners from crossing.
  const offset = Math.min(distance, length / 2)
  return { x: from.x + (dx / length) * offset, y: from.y + (dy / length) * offset }
}

/** Replaces each interior vertex of line geometry with a quadratic corner. */
const softenCorners = (geometry: BaseGestureGeometry, cornerRadius: number): BaseGestureGeometry => {
  if (cornerRadius <= 0 || geometry.segments.length < 2 || geometry.segments.some(segment => segment.kind !== 'line')) {
    return geometry
  }

  const lines = geometry.segments as readonly LineGestureSegment[]
  const points = [lines[0].from, ...lines.map(segment => segment.to)]
  const segments = points.slice(1, -1).reduce<GestureSegment[]>((softened, vertex, index) => {
    const before = pointTowards(vertex, points[index], cornerRadius)
    const after = pointTowards(vertex, points[index + 2], cornerRadius)
    const from = softened.at(-1)?.to ?? points[0]
    return [
      ...softened,
      { kind: 'line', from, to: before, gestureIndex: lines[index].gestureIndex },
      {
        kind: 'quadratic',
        from: before,
        control: vertex,
        to: after,
        gestureIndex: lines[index].gestureIndex,
      },
    ]
  }, [])
  const from = segments.at(-1)?.to ?? points[0]
  return {
    ...geometry,
    segments: [...segments, { kind: 'line', from, to: points.at(-1)!, gestureIndex: lines.at(-1)!.gestureIndex }],
  }
}

/** Returns the final direction vector of a canonical segment. */
const getEndTangent = (segment: GestureSegment): GesturePoint => {
  if (segment.kind === 'line') return { x: segment.to.x - segment.from.x, y: segment.to.y - segment.from.y }
  if (segment.kind === 'quadratic') return { x: segment.to.x - segment.control.x, y: segment.to.y - segment.control.y }

  const radians = (segment.endAngle * Math.PI) / 180
  const radial = { x: Math.cos(radians), y: Math.sin(radians) }
  return segment.sweepFlag === 1 ? { x: -radial.y, y: radial.x } : { x: radial.y, y: -radial.x }
}

/** Constructs a chevron whose apex follows the final gesture tangent. */
const getChevron = (
  tip: GesturePoint,
  tangent: GesturePoint,
  {
    apexAngle,
    halfSpan,
  }: {
    /** Interior angle at the chevron apex. */
    apexAngle: number
    /** Perpendicular distance from the centerline to either leg. */
    halfSpan: number
  },
): readonly [GesturePoint, GesturePoint, GesturePoint] => {
  const length = Math.hypot(tangent.x, tangent.y) || 1
  const forwardX = tangent.x / length
  const forwardY = tangent.y / length
  const sideX = -forwardY
  const sideY = forwardX
  const depth = halfSpan / Math.max(Math.tan((apexAngle / 2) * (Math.PI / 180)), 0.01)
  const legsX = tip.x - (forwardX * depth) / 2
  const legsY = tip.y - (forwardY * depth) / 2
  return [
    { x: legsX + sideX * halfSpan, y: legsY + sideY * halfSpan },
    { x: legsX + forwardX * depth, y: legsY + forwardY * depth },
    { x: legsX - sideX * halfSpan, y: legsY - sideY * halfSpan },
  ]
}

/** Builds the complete canonical shape consumed by paint and framing. */
const getGestureGeometry = (
  path: Gesture,
  {
    chevron,
    cornerRadius = 0,
    reversalOffset,
    rounded,
    size,
  }: {
    /** Dimensions of a geometry-based chevron, or undefined for an SVG marker. */
    chevron?: { apexAngle: number; halfSpan: number }
    /** Radius used to soften vertices in line geometry. */
    cornerRadius?: number
    /** Orthogonal offset used to separate reversing directions. */
    reversalOffset: number
    /** Whether to construct the legacy circular-arc topology. */
    rounded?: boolean
    /** Nominal gesture extent in SVG user units. */
    size: number
  },
): GestureGeometry => {
  const geometry = softenCorners(getBaseGestureGeometry(path, { reversalOffset, rounded, size }), cornerRadius)
  if (!chevron || path === 'rdld') return { ...geometry, chevron: null }

  const finalSegment = geometry.segments.at(-1)!
  const chevronPoints = getChevron(finalSegment.to, getEndTangent(finalSegment), chevron)
  return {
    ...geometry,
    // Extending the centerline to the apex lets the gradient finish at the gesture's visual tip.
    segments: [...geometry.segments.slice(0, -1), { ...finalSegment, to: chevronPoints[1] }] as GestureSegment[],
    chevron: chevronPoints,
  }
}

export default getGestureGeometry
