import { GenieSample } from '../GenieFrame'

/** A point on the flight path, and how far along the path it is from the head, in CSS pixels. */
export interface PathPoint {
  x: number
  y: number
  distance: number
}

/** How far apart, at most, the points of the smoothed curve are, in CSS pixels. Smaller is smoother but costs more. */
const CURVE_STEP = 6

/**
 * Turns the head's remembered positions into the smooth curve the trail is drawn along.
 *
 * The positions are separate points, one per frame. At speed they sit far apart (at 1600px/s the head moves 27px
 * between frames at 60Hz), so joining them with straight lines would give the trail visible corners. This fits a
 * smooth curve through every point instead (a Catmull-Rom spline, which passes exactly through each point and bends
 * gently between them), and measures how far along the curve each of its points is. The trail uses that distance to
 * taper and color itself from head to tail.
 *
 * Returns the curve from the head to the tail.
 */
const flightPath = (samples: GenieSample[]): PathPoint[] => {
  // Drop positions less than half a pixel from the last one kept. A head at rest records the same spot every frame,
  // and zero-length steps have no direction to curve along. Built with push, since this runs every frame.
  const points = samples.reduce<GenieSample[]>((kept, sample) => {
    const last = kept[kept.length - 1]
    if (!last || Math.hypot(sample.x - last.x, sample.y - last.y) > 0.5) kept.push(sample)
    return kept
  }, [])

  // With fewer than three points there is nothing to curve, so the points are used as they are.
  const curve =
    points.length < 3
      ? points
      : [
          // Between each pair of neighboring points (p1 to p2), add points along the curve, using the point before
          // (p0) and after (p3) to decide which way it bends. The first and last pairs reuse their end point.
          ...points.slice(0, -1).flatMap((p1, i) => {
            const p0 = points[i - 1] ?? p1
            const p2 = points[i + 1]
            const p3 = points[i + 2] ?? p2
            const steps = Math.min(8, Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / CURVE_STEP)))
            return Array.from({ length: steps }, (_, step) => {
              // t runs from 0 at p1 towards 1 at p2. The Catmull-Rom formula blends the four points by t.
              const t = step / steps
              /** The Catmull-Rom blend of one coordinate of the four points. */
              const blend = (a: number, b: number, c: number, d: number) =>
                0.5 *
                (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
              return { x: blend(p0.x, p1.x, p2.x, p3.x), y: blend(p0.y, p1.y, p2.y, p3.y) }
            })
          }),
          points[points.length - 1],
        ]

  // Measure how far along the curve each point is, by adding up the lengths of the steps before it.
  return curve.reduce<PathPoint[]>((path, point) => {
    const previous = path[path.length - 1]
    path.push({
      x: point.x,
      y: point.y,
      distance: previous ? previous.distance + Math.hypot(point.x - previous.x, point.y - previous.y) : 0,
    })
    return path
  }, [])
}

export default flightPath
