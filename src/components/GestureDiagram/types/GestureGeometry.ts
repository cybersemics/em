import Gesture from '../../../@types/Gesture'
import GesturePoint from './GesturePoint'
import GestureSegment from './GestureSegment'

/** Canonical gesture geometry before paint or framing is applied. */
interface GestureGeometry {
  /** Gesture supplied by the caller. */
  path: Gesture
  /** Gesture after applying shape-preserving rendering extensions. */
  extendedPath: Gesture
  /** Ordered geometric segments associated with their semantic directions. */
  segments: readonly GestureSegment[]
  /**
   * Chevron points as leg, apex, leg, or null when the arrowhead uses an SVG marker.
   * SolidGestureRenderer fills them for 'filled'. ContinuousGradientGestureRenderer strokes them for 'outlined-wide'.
   */
  chevron: readonly [GesturePoint, GesturePoint, GesturePoint] | null
}

export default GestureGeometry
