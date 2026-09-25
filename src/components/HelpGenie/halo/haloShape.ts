import GenieFrame, { GenieSample } from '../GenieFrame'
import {
  HALO_COOL_OFFSET,
  HALO_FULL_SPEED,
  HALO_LAG,
  HALO_MAX_LAG,
  HALO_SAMPLES,
  HALO_SIZE,
  HALO_STRETCH,
} from '../constants'

/** A point the glow is measured from, and how far it is from the glow's center along the path. */
export interface HaloPoint {
  x: number
  y: number
  /** How far along the glow the point is, squared: 0 at the center, 1 at either end. */
  along: number
}

/** Everything the halo's shader needs to draw the glow for one frame. */
export interface HaloShape {
  /** Half the glow's width, across the path. It narrows as the glow stretches. */
  across: number
  /** Points along the path the glow is shaped around. See halo.frag for how they become a glow. */
  points: HaloPoint[]
  /** The same for the cool light on the glow's underside, which is half the size and sits a little lower. */
  coolPoints: HaloPoint[]
  /** A rectangle covering every pixel the glow can reach, so the shader only runs where it is needed. */
  bounds: { left: number; top: number; right: number; bottom: number }
}

/**
 * The point `distance` pixels back along the head's remembered positions, found by walking back through them and
 * adding up the gaps. Before the head (a negative distance) the path carries on straight along `heading`; beyond the
 * oldest position, straight along the last stretch of path. The glow can be shaped around any points, so these
 * extensions only need to be sensible.
 */
const pointBehind = (
  samples: GenieSample[],
  distance: number,
  heading: { x: number; y: number },
): { x: number; y: number } => {
  if (distance <= 0) return { x: samples[0].x - heading.x * distance, y: samples[0].y - heading.y * distance }
  const walk = samples.slice(1).reduce<{ walked: number; point: { x: number; y: number } | null }>(
    (acc, b, i) => {
      if (acc.point) return acc
      const a = samples[i]
      const gap = Math.hypot(b.x - a.x, b.y - a.y)
      // Not there yet: add this gap and keep walking.
      if (acc.walked + gap < distance) return { walked: acc.walked + gap, point: null }
      // The point lies within this gap: interpolate between its two ends.
      const k = (distance - acc.walked) / (gap || 1)
      return { walked: distance, point: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k } }
    },
    { walked: 0, point: null },
  )
  if (walk.point) return walk.point
  // Past the oldest position: continue in the direction the path was going, or behind the heading if it had none.
  const last = samples[samples.length - 1]
  const previous = samples[samples.length - 2]
  const gap = previous ? Math.hypot(last.x - previous.x, last.y - previous.y) : 0
  const direction =
    gap > 0.5 ? { x: (last.x - previous.x) / gap, y: (last.y - previous.y) / gap } : { x: -heading.x, y: -heading.y }
  const rest = distance - walk.walked
  return { x: last.x + direction.x * rest, y: last.y + direction.y * rest }
}

/**
 * How far back along the path, in pixels, the glow's center sits.
 *
 * The center is where the head was HALO_LAG seconds ago, which keeps the glow trailing slightly behind the bright head.
 * It is found by walking back through the remembered positions, adding up the distance, until one is that old. At high
 * speed that can be a long way back, so the walk stops early at HALO_MAX_LAG of the glow's diameter; otherwise the
 * glow would come loose from the head.
 */
const haloLag = (frame: GenieFrame): number => {
  const { samples, now } = frame.motion
  const maxLag = HALO_SIZE * HALO_MAX_LAG
  const walk = samples.slice(1).reduce<{ walked: number; lag: number | null }>(
    (acc, b, i) => {
      if (acc.lag !== null) return acc
      const a = samples[i]
      const gap = Math.hypot(b.x - a.x, b.y - a.y)
      const oldEnough = (now - b.time) / 1000 >= HALO_LAG
      const farEnough = acc.walked + gap >= maxLag
      if (!oldEnough && !farEnough) return { walked: acc.walked + gap, lag: null }
      // Stop within this gap, where the limit that was reached first is met exactly.
      const k = farEnough
        ? (maxLag - acc.walked) / (gap || 1)
        : (HALO_LAG * 1000 - (now - a.time)) / (a.time - b.time || 1)
      return { walked: acc.walked, lag: acc.walked + gap * Math.min(1, Math.max(0, k)) }
    },
    { walked: 0, lag: null },
  )
  // A trail too short to reach either limit puts the center at its far end.
  return walk.lag ?? walk.walked
}

/**
 * The glow's shape for this frame.
 *
 * At rest the glow is a circle HALO_SIZE across. As the head speeds up it stretches along the path by up to
 * HALO_STRETCH, and narrows so its area stays about the same. On a straight path that is an ellipse; on a turn the same
 * ellipse bends with the path. To bend it, the glow is described by points laid along the path either side of its
 * center rather than by a fixed ellipse, and halo.frag works out each pixel's color from its distance to those points.
 *
 * An unstretched glow is a circle, which needs only one point, so at rest one point is used instead of HALO_SAMPLES. Each
 * point costs the shader a step for every pixel of the glow, so this is most of its work at rest.
 */
const haloShape = (frame: GenieFrame): HaloShape => {
  const { motion, heading } = frame
  const speed = Math.hypot(motion.vx, motion.vy)
  const stretch = 1 + HALO_STRETCH * Math.min(1, speed / HALO_FULL_SPEED)
  // Half-length along the path and half-width across it.
  const halfLength = (HALO_SIZE * stretch) / 2
  const across = HALO_SIZE / (2 * Math.sqrt(stretch))
  // How far either side of the center the points are laid. Each point contributes a circle of radius `across`, so
  // reaching sqrt(halfLength² - across²) makes their outline exactly halfLength long (see halo.frag).
  const reach = Math.sqrt(Math.max(0, halfLength * halfLength - across * across))
  const center = haloLag(frame)

  // Less than half a pixel of stretch is indistinguishable from a circle.
  const count = reach < 0.5 ? 1 : HALO_SAMPLES
  const points = Array.from({ length: count }, (_, k) => {
    // u runs from -1 to 1 across the points: -1 is reach pixels in front of the center (the glow's front, towards the
    // head), and 1 is reach pixels behind it (the glow's tail). A single point sits at the center.
    const u = count === 1 ? 0 : (2 * k) / (count - 1) - 1
    const halo = pointBehind(motion.samples, center + u * reach, heading)
    const cool = pointBehind(motion.samples, center + (u * reach) / 2, heading)
    return {
      halo: { x: halo.x, y: halo.y, along: u * u },
      cool: { x: cool.x, y: cool.y + across * HALO_COOL_OFFSET, along: u * u },
    }
  })

  const xs = points.map(({ halo }) => halo.x)
  const ys = points.map(({ halo }) => halo.y)
  return {
    across,
    points: points.map(({ halo }) => halo),
    coolPoints: points.map(({ cool }) => cool),
    bounds: {
      left: Math.min(...xs) - across,
      top: Math.min(...ys) - across,
      right: Math.max(...xs) + across,
      bottom: Math.max(...ys) + across,
    },
  }
}

export default haloShape
