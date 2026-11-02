import { useTick } from '@pixi/react'
import { BlurFilter, Graphics } from 'pixi.js'
import { RefObject, useEffect, useMemo, useRef } from 'react'
import GenieFrame from '../GenieFrame'
import { CORE_COLOR, CORE_LENGTH, CORE_OPACITY, CORE_RADIUS, TRAIL_BLUR, TRAIL_STOPS, TRAIL_WIDTH } from '../constants'
import flightPath, { PathPoint } from './flightPath'
import trailWidth from './trailWidth'

/**
 * The trail's color at a point along it, from TRAIL_STOPS. `t` is 0 at the head and 1 at the tail. Returns the color as
 * a number and its opacity separately, as Pixi's fill takes them.
 */
const trailColor = (t: number): { color: number; alpha: number } => {
  // The two stops either side of t, and how far t is from the first towards the second.
  const next = Math.max(
    1,
    TRAIL_STOPS.findIndex(stop => stop.t >= t),
  )
  const a = TRAIL_STOPS[next - 1]
  const b = TRAIL_STOPS[next]
  const k = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))
  const [r, g, blue, alpha] = a.rgba.map((v, i) => v + (b.rgba[i] - v) * k)
  return { color: (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(blue), alpha }
}

/**
 * The four corners of the strip of ribbon between two neighboring points on the path, `halfWidth0` either side of the
 * first and `halfWidth1` either side of the second. "Either side" is along each point's normal: the direction at right
 * angles to the path there, taken from its neighbors.
 */
const ribbonQuad = (path: PathPoint[], i: number, halfWidth0: number, halfWidth1: number): number[] => {
  /** Unit vector at right angles to the path at point j. */
  const normal = (j: number) => {
    const before = path[Math.max(0, j - 1)]
    const after = path[Math.min(path.length - 1, j + 1)]
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1
    return { x: -(after.y - before.y) / length, y: (after.x - before.x) / length }
  }
  const p0 = path[i]
  const p1 = path[i + 1]
  const n0 = normal(i)
  const n1 = normal(i + 1)
  return [
    p0.x + n0.x * halfWidth0,
    p0.y + n0.y * halfWidth0,
    p1.x + n1.x * halfWidth1,
    p1.y + n1.y * halfWidth1,
    p1.x - n1.x * halfWidth1,
    p1.y - n1.y * halfWidth1,
    p0.x - n0.x * halfWidth0,
    p0.y - n0.y * halfWidth0,
  ]
}

/**
 * The trail: a ribbon of light along the flight path, with the hot core running down its front. Both are redrawn
 * every frame from the head's remembered positions, then blurred and screen-blended so they read as light.
 */
const GenieTrail = ({ frameRef }: { frameRef: RefObject<GenieFrame> }) => {
  const graphicsRef = useRef<Graphics>(null)

  // The blur that turns the ribbon into light. Created once, destroyed on unmount.
  const blur = useMemo(() => {
    const filter = new BlurFilter({ strength: TRAIL_BLUR, quality: 4, resolution: 'inherit', blendMode: 'screen' })
    // Pixi only blurs within the ribbon's bounds plus a margin of twice the strength, which cuts the blur's soft edge
    // off in a hard square. Four times leaves room for all of it.
    filter.padding = TRAIL_BLUR * 4
    return filter
  }, [])
  useEffect(() => () => blur.destroy(), [blur])

  useTick(() => {
    const graphics = graphicsRef.current
    if (!graphics) return
    const { motion } = frameRef.current
    const path = flightPath(motion.samples)
    // The trail's length. At rest it has none, and the ribbon reduces to the round cap at the head.
    const length = path[path.length - 1].distance || 1
    const segments = path.slice(0, -1).map((point, i) => ({
      i,
      from: point.distance,
      to: path[i + 1].distance,
      middle: (point.distance + path[i + 1].distance) / 2,
    }))

    graphics.clear()

    // The ribbon: one strip per pair of neighboring points, as wide as trailWidth allows there, in the trail's color
    // at that point. A round cap at the head keeps the front of the ribbon round.
    segments.forEach(({ i, from, to, middle }) => {
      const halfWidth0 = (TRAIL_WIDTH / 2) * trailWidth(from / length)
      const halfWidth1 = (TRAIL_WIDTH / 2) * trailWidth(to / length)
      graphics.poly(ribbonQuad(path, i, halfWidth0, halfWidth1)).fill(trailColor(middle / length))
    })
    graphics.circle(motion.x, motion.y, TRAIL_WIDTH / 2).fill(trailColor(0))

    // The hot core: the same kind of strips down the front CORE_LENGTH of the trail, narrowing and fading to nothing
    // where the core ends, with a round cap at the head.
    const coreEnd = CORE_LENGTH * length
    segments
      .filter(({ middle }) => middle <= coreEnd)
      .forEach(({ i, from, to, middle }) => {
        const halfWidth0 = CORE_RADIUS * Math.max(0, 1 - from / coreEnd) ** 0.8
        const halfWidth1 = CORE_RADIUS * Math.max(0, 1 - to / coreEnd) ** 0.8
        graphics
          .poly(ribbonQuad(path, i, halfWidth0, halfWidth1))
          .fill({ color: CORE_COLOR, alpha: CORE_OPACITY * (1 - middle / coreEnd) ** 1.5 })
      })
    graphics.circle(motion.x, motion.y, CORE_RADIUS).fill({ color: CORE_COLOR, alpha: CORE_OPACITY })
  })

  // Drawn from useTick every frame, so the draw callback, which only runs when React renders, has nothing to do.
  return <pixiGraphics ref={graphicsRef} filters={[blur]} draw={() => {}} />
}

export default GenieTrail
