import GenieFrame from '../GenieFrame'
import { MEMORY } from '../constants'
import stepGenie from '../stepGenie'

/** A genie at rest at the origin. */
const START: GenieFrame = {
  motion: { x: 0, y: 0, vx: 0, vy: 0, now: 0, samples: [] },
  heading: { x: 1, y: 0 },
  sparkles: [],
}

/** Steps the genie towards a fixed target for a number of 60Hz frames, and returns every frame. */
const fly = (frame: GenieFrame, target: { x: number; y: number }, frames: number, random = Math.random) =>
  Array.from({ length: frames }).reduce<GenieFrame[]>(
    (acc, _, i) => [...acc, stepGenie(i === 0 ? frame : acc[i - 1], { target, dt: 1000 / 60, bob: 0, random })],
    [],
  )

it('gives off sparkles in flight, and only a few at rest', () => {
  const frames = fly(START, { x: 600, y: 0 }, 300)
  const inFlight = Math.max(...frames.map(frame => frame.sparkles.length))
  const atRest = frames[frames.length - 1].sparkles.length

  expect(inFlight).toBeGreaterThan(100)
  expect(atRest).toBeLessThan(5)
})

it('lets no sparkle outlive the trail', () => {
  const frames = fly(START, { x: 600, y: 0 }, 120)
  const last = frames[frames.length - 1]

  expect(last.sparkles.every(sparkle => sparkle.life <= MEMORY && last.motion.now - sparkle.born < sparkle.life)).toBe(
    true,
  )
})

it('keeps its last real heading once at rest', () => {
  const frames = fly(START, { x: 0, y: 400 }, 300)
  const last = frames[frames.length - 1]
  // The last frame in which the head was really moving. It overshoots on the way in, so this is it coming back up.
  const lastMoving = [...frames].reverse().find(frame => Math.hypot(frame.motion.vx, frame.motion.vy) > 1)!
  const speed = Math.hypot(lastMoving.motion.vx, lastMoving.motion.vy)

  expect(Math.hypot(last.motion.vx, last.motion.vy)).toBeLessThan(1)
  expect(last.heading.x).toBeCloseTo(lastMoving.motion.vx / speed, 6)
  expect(last.heading.y).toBeCloseTo(lastMoving.motion.vy / speed, 6)
})

it('flies the same frames given the same random numbers', () => {
  /** A fixed sequence standing in for Math.random. */
  const sequence = () => {
    const values = [0.1, 0.7, 0.4, 0.9, 0.2, 0.6, 0.3, 0.8]
    const state = { i: 0 }
    return () => values[state.i++ % values.length]
  }
  const a = fly(START, { x: 300, y: 200 }, 60, sequence())
  const b = fly(START, { x: 300, y: 200 }, 60, sequence())

  expect(b[b.length - 1]).toEqual(a[a.length - 1])
})
