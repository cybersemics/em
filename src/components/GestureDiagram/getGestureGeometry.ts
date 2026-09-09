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

/** Converts a gesture into the canonical line, arc, or quadratic segments used by every renderer. */
const getGestureGeometry = (
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
): GestureGeometry => {
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

export default getGestureGeometry
