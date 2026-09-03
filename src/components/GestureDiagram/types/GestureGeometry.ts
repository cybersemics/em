import Gesture from '../../../@types/Gesture'
import GestureSegment from './GestureSegment'

/** Canonical gesture geometry before paint or framing is applied. */
interface GestureGeometry {
  /** Gesture supplied by the caller. */
  path: Gesture
  /** Gesture after applying shape-preserving rendering extensions. */
  extendedPath: Gesture
  /** Ordered geometric segments associated with their semantic directions. */
  segments: readonly GestureSegment[]
}

export default GestureGeometry
