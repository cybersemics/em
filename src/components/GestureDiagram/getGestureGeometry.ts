import Direction from '../../@types/Direction'
import Gesture from '../../@types/Gesture'
import getGestureBounds from './getGestureBounds'
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
const generateArcCoordinates = (index: number, pathDirs: Direction[]) => {
  const radius = 1
  const center = { x: 0, y: 0 }

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

// Question-mark template, scaled to the requested size by the same rule as other gestures.
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

type Turn = 'cw' | 'ccw'

/** Unit vector of each direction in SVG space, where y points down. */
const directionVector = (dir: Direction): GesturePoint =>
  ({
    l: { x: -1, y: 0 },
    r: { x: 1, y: 0 },
    u: { x: 0, y: -1 },
    d: { x: 0, y: 1 },
  })[dir]

/** Returns whether moving from one direction to the next is a clockwise or counterclockwise quarter turn, or null for a reversal or repeat. */
const getTurn = (from: Direction, to: Direction): Turn | null =>
  rotateClockwise(from) === to ? 'cw' : rotateClockwise(to) === from ? 'ccw' : null

/**
 * Builds a rounded gesture whose turns change direction, e.g. lul, as one quarter-circle per turn.
 * Consecutive quarter-circles share their tangent at the join, so a flip in turn direction becomes a smooth inflection.
 * Each quarter is split at its midpoint so that the direction entering and the direction leaving the turn each own half of it.
 */
const getInflectedArcSegments = (directions: Direction[], turns: Turn[]): ArcGestureSegment[] =>
  turns
    .reduce<{ point: GesturePoint; segments: ArcGestureSegment[] }>(
      ({ point, segments }, turn, i) => {
        const heading = directionVector(directions[i])
        // The center lies on the side the gesture turns toward, one radius from the current point.
        // Rotating (x, y) clockwise in y-down space gives (-y, x).
        const toCenter = turn === 'cw' ? { x: -heading.y, y: heading.x } : { x: heading.y, y: -heading.x }
        const center = { x: point.x + toCenter.x, y: point.y + toCenter.y }
        const startAngle = (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
        // Clockwise travel increases the angle in y-down space, matching sweepFlag 1.
        const step = turn === 'cw' ? 45 : -45

        /** Returns the point on this turn's circle at the given angle. */
        const pointAt = (angle: number): GesturePoint => ({
          x: center.x + Math.cos((angle * Math.PI) / 180),
          y: center.y + Math.sin((angle * Math.PI) / 180),
        })

        const halves = [0, 1].map<ArcGestureSegment>(half => ({
          kind: 'arc',
          from: pointAt(startAngle + half * step),
          to: pointAt(startAngle + (half + 1) * step),
          center,
          radius: 1,
          startAngle: startAngle + half * step,
          endAngle: startAngle + (half + 1) * step,
          sweepFlag: turn === 'cw' ? 1 : 0,
          gestureIndex: i + half,
        }))
        return { point: halves[1].to, segments: [...segments, ...halves] }
      },
      { point: { x: 0, y: 0 }, segments: [] },
    )
    .segments

type BaseGestureGeometry = Omit<GestureGeometry, 'chevron'>

/** Builds an unscaled line, circular-arc or question-mark template. */
const getBaseGestureGeometry = (
  path: Gesture,
  {
    reversalRatio,
    rounded,
  }: {
    /** Reversal offset as a fraction of the requested gesture size. */
    reversalRatio: number
    rounded?: boolean
  },
): BaseGestureGeometry => {
  if (path === 'rdld') return { path, extendedPath: path, segments: RDLD_SEGMENTS }

  if (rounded) {
    const directions = Array.from(path) as Direction[]
    // A single circle only fits when every turn goes the same way, e.g. lurd or rul.
    // When the turn direction flips, e.g. lul, the curve needs an inflection and is built turn by turn.
    const turns = directions.slice(1).map((dir, i) => getTurn(directions[i], dir))
    if (turns.length > 1 && turns.every(turn => turn !== null) && turns.some(turn => turn !== turns[0])) {
      return { path, extendedPath: path, segments: getInflectedArcSegments(directions, turns as Turn[]) }
    }

    const segments = directions.map<ArcGestureSegment>((_, gestureIndex) => {
      const { startX, startY, radius, sweepFlag, endX, endY, startAngle, endAngle, center } = generateArcCoordinates(
        gestureIndex,
        directions,
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

  /** Calculates a unit-template displacement using the existing reversal rules. */
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
        ? reversalRatio
        : 0
    const flipOffset =
      (i < directions.length - 2 && !negative === clockwiseAfterNext) || (i > 0 && !negative === clockwisePrev)
    return {
      dx: horizontal ? (1 - shorten) * (negative ? -1 : 1) : (reversal ? reversalRatio : 0) * (flipOffset ? -1 : 1),
      dy: !horizontal ? (1 - shorten) * (!negative ? -1 : 1) : (reversal ? reversalRatio : 0) * (flipOffset ? -1 : 1),
    }
  }

  const deltas = directions.map(getDelta)
  const points = deltas.reduce<GesturePoint[]>(
    (positions, delta) => {
      const previous = positions[positions.length - 1]
      return [...positions, { x: previous.x + delta.dx, y: previous.y + delta.dy }]
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

/** Scales any path template so its longest dimension equals size, before corners, arrowheads or strokes. */
const scaleGeometryToSize = (geometry: BaseGestureGeometry, size: number): BaseGestureGeometry => {
  const bounds = getGestureBounds({ ...geometry, chevron: null })
  const extent = Math.max(bounds.width, bounds.height)
  if (extent === 0) return geometry

  const scale = size / extent
  /** Scales a template point to the requested gesture size. */
  const scalePoint = (point: GesturePoint): GesturePoint => ({
    x: point.x * scale,
    y: point.y * scale,
  })

  return {
    ...geometry,
    segments: geometry.segments.map<GestureSegment>(segment => {
      const from = scalePoint(segment.from)
      const to = scalePoint(segment.to)
      return segment.kind === 'arc'
        ? { ...segment, from, to, center: scalePoint(segment.center), radius: segment.radius * scale }
        : segment.kind === 'quadratic'
          ? { ...segment, from, to, control: scalePoint(segment.control) }
          : { ...segment, from, to }
    }),
  }
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
    /** Dimensions of a geometry-based chevron, or undefined for an SVG marker. A filled chevron applies to a final line or arc. */
    chevron?: { apexAngle: number; halfSpan: number; filled?: boolean }
    /** Radius used to soften vertices in line geometry. */
    cornerRadius?: number
    /** Orthogonal offset used to separate reversing directions. */
    reversalOffset: number
    /** Whether to construct circular arcs instead of straight segments. */
    rounded?: boolean
    /** Longest centerline dimension before corner rounding and arrowheads, in SVG units. */
    size: number
  },
): GestureGeometry => {
  const base = getBaseGestureGeometry(path, { reversalRatio: size === 0 ? 0 : reversalOffset / size, rounded })
  const geometry = softenCorners(scaleGeometryToSize(base, size), cornerRadius)
  const finalSegment = geometry.segments.at(-1)
  if (path === 'rdld' || !finalSegment || !chevron) return { ...geometry, chevron: null }

  const chevronPoints = getChevron(finalSegment.to, getEndTangent(finalSegment), chevron)

  if (chevron.filled) {
    const legs = {
      x: (chevronPoints[0].x + chevronPoints[2].x) / 2,
      y: (chevronPoints[0].y + chevronPoints[2].y) / 2,
    }

    // An arc keeps its full length, so the chevron moves forward until its legs meet the arc's end.
    // Only the arc's round cap then reaches under the chevron, as with a trimmed line.
    // The tip lands half a chevron depth further out than on a line, which the viewBox padding must still fit.
    if (finalSegment.kind === 'arc') {
      const [legA, apex, legB] = chevronPoints.map(point => ({
        x: point.x + finalSegment.to.x - legs.x,
        y: point.y + finalSegment.to.y - legs.y,
      }))
      return { ...geometry, chevron: [legA, apex, legB] }
    }

    const segmentLength = Math.hypot(finalSegment.to.x - finalSegment.from.x, finalSegment.to.y - finalSegment.from.y)
    const legsBehindEnd = Math.hypot(finalSegment.to.x - legs.x, finalSegment.to.y - legs.y)
    // The shaft stops between the legs so its round cap stays inside the filled chevron.
    // A final line shorter than that distance collapses to its start rather than reversing.
    const shaftEnd = segmentLength > legsBehindEnd ? legs : finalSegment.from
    return {
      ...geometry,
      segments: [...geometry.segments.slice(0, -1), { ...finalSegment, to: shaftEnd }],
      chevron: chevronPoints,
    }
  }

  return {
    ...geometry,
    // An arc's endpoint is fixed by its circle and angles. Add a tangent line so the
    // centerline and its gradient reach the apex without changing the circular shape.
    segments:
      finalSegment.kind === 'arc'
        ? [
            ...geometry.segments,
            { kind: 'line', from: finalSegment.to, to: chevronPoints[1], gestureIndex: finalSegment.gestureIndex },
          ]
        : [...geometry.segments.slice(0, -1), { ...finalSegment, to: chevronPoints[1] }],
    chevron: chevronPoints,
  }
}

export default getGestureGeometry
