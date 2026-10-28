import { TRAIL_NECK, TRAIL_TAPER } from '../constants'

/**
 * How wide the trail is at a point along it, as a fraction of its full width (TRAIL_WIDTH).
 *
 * `t` is how far along the trail the point is: 0 at the head, 1 at the tail. The trail stays at full width for the
 * first TRAIL_NECK of its length, so the head reads as one body with the trail rather than a ball on a stick, then
 * narrows smoothly to nothing at the tail. TRAIL_TAPER sets the shape of that narrowing.
 *
 * Used by the trail to draw its ribbon, and by the sparkles to stay inside it.
 */
const trailWidth = (t: number): number => {
  // How far through the tapering part the point is: 0 at the end of the neck (and anywhere before it), 1 at the tail.
  const taper = Math.max(0, (t - TRAIL_NECK) / (1 - TRAIL_NECK))
  return Math.pow(1 - taper, TRAIL_TAPER)
}

export default trailWidth
