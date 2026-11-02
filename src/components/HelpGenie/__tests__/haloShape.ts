import GenieFrame from '../GenieFrame'
import { HALO_SIZE } from '../constants'
import haloShape from '../halo/haloShape'

/** A frame whose head flew along the given positions (newest first), one per 60Hz frame, moving at the given velocity. */
const frameAlong = (positions: { x: number; y: number }[], velocity: { x: number; y: number }): GenieFrame => ({
  motion: {
    ...positions[0],
    vx: velocity.x,
    vy: velocity.y,
    now: 0,
    samples: positions.map((position, i) => ({ ...position, time: (-i * 1000) / 60 })),
  },
  heading: { x: 1, y: 0 },
  sparkles: [],
})

it('is a circle HALO_SIZE across at rest', () => {
  const shape = haloShape(frameAlong([{ x: 100, y: 100 }], { x: 0, y: 0 }))

  expect(shape.across).toBe(HALO_SIZE / 2)
  // With no stretch, a single point at the center is enough.
  expect(shape.points).toEqual([{ x: 100, y: 100, along: 0 }])
})

it('stretches along a straight path at speed, narrowing across it', () => {
  // Flying right at full speed: 1600px/s is about 27px a frame.
  const positions = Array.from({ length: 25 }, (_, i) => ({ x: 800 - i * 27, y: 100 }))
  const shape = haloShape(frameAlong(positions, { x: 1600, y: 0 }))

  expect(shape.across).toBeLessThan(HALO_SIZE / 2)
  expect(shape.points.every(point => point.y === 100)).toBe(true)
  // The points run from the glow's front (towards the head, on the right) to its tail.
  expect(shape.points[0].x - shape.points[shape.points.length - 1].x).toBeGreaterThan(HALO_SIZE / 2)
})

it('bends with the path on a turn', () => {
  // Flying up, having just come round a right-angle turn from flying right.
  const positions = [
    ...Array.from({ length: 5 }, (_, i) => ({ x: 400, y: 100 + i * 27 })),
    ...Array.from({ length: 20 }, (_, i) => ({ x: 400 - (i + 1) * 27, y: 208 })),
  ]
  const shape = haloShape(frameAlong(positions, { x: 0, y: -1600 }))

  // The points at the glow's tail end lie along the horizontal stretch, not on the line of the vertical one.
  const tail = shape.points[shape.points.length - 1]
  expect(tail.y).toBeCloseTo(208, 6)
  expect(tail.x).toBeLessThan(400)
})
