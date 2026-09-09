import GesturePoint from './GesturePoint'

interface GestureSegmentBase {
  /** Start of the segment. */
  from: GesturePoint
  /** End of the segment. */
  to: GesturePoint
  /** Index of the source gesture direction represented by this geometry. */
  gestureIndex: number
}

interface LineGestureSegment extends GestureSegmentBase {
  /** Straight-line segment discriminator. */
  kind: 'line'
}

interface ArcGestureSegment extends GestureSegmentBase {
  /** Circular-arc segment discriminator. */
  kind: 'arc'
  /** Center of the source circle. */
  center: GesturePoint
  /** Radius of the source circle. */
  radius: number
  /** Unwrapped starting angle in degrees. */
  startAngle: number
  /** Unwrapped ending angle in degrees. Its difference from startAngle defines the signed sweep. */
  endAngle: number
  /** SVG direction flag for the arc. */
  sweepFlag: 0 | 1
}

interface QuadraticGestureSegment extends GestureSegmentBase {
  /** Quadratic Bézier segment discriminator. */
  kind: 'quadratic'
  /** Bézier control point. */
  control: GesturePoint
}

/** A canonical line, circular arc, or quadratic segment of a gesture. */
type GestureSegment = LineGestureSegment | ArcGestureSegment | QuadraticGestureSegment

export default GestureSegment
