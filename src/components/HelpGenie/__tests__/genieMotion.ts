import { GenieMotion } from '../GenieFrame'
import genieMotion from '../genieMotion'

const OPTIONS = { dt: 1000 / 60, memory: 420, stiffness: 90, damping: 0.62, bob: 0 }

/** A genie at rest at the origin. */
const START: GenieMotion = { x: 0, y: 0, vx: 0, vy: 0, now: 0, samples: [] }

/** Steps the genie for a number of frames towards a fixed target and returns every frame. */
const fly = (
  motion: GenieMotion,
  target: { x: number; y: number },
  frames: number,
  options: Partial<typeof OPTIONS> = {},
): GenieMotion[] =>
  Array.from({ length: frames }).reduce<GenieMotion[]>(
    (acc, _, i) => [...acc, genieMotion(i === 0 ? motion : acc[i - 1], { ...OPTIONS, ...options, target })],
    [],
  )

/** Length of the trail: the distance along the head's remembered positions. */
const trailLength = (motion: GenieMotion): number =>
  motion.samples
    .slice(1)
    .reduce((sum, sample, i) => sum + Math.hypot(sample.x - motion.samples[i].x, sample.y - motion.samples[i].y), 0)

it('settles on a still target', () => {
  const frames = fly(START, { x: 300, y: -200 }, 300)
  const last = frames[frames.length - 1]

  expect(last.x).toBeCloseTo(300, 1)
  expect(last.y).toBeCloseTo(-200, 1)
  expect(Math.hypot(last.vx, last.vy)).toBeLessThan(0.1)
})

it('flies the same path at 60Hz and 120Hz', () => {
  const at60 = fly(START, { x: 400, y: 250 }, 30, { dt: 1000 / 60 })
  const at120 = fly(START, { x: 400, y: 250 }, 60, { dt: 1000 / 120 })

  // Half a second into the flight, while the head is still moving fast.
  const a = at60[at60.length - 1]
  const b = at120[at120.length - 1]
  expect(Math.hypot(a.vx, a.vy)).toBeGreaterThan(100)
  expect(b.x).toBeCloseTo(a.x, 6)
  expect(b.y).toBeCloseTo(a.y, 6)
  expect(b.vx).toBeCloseTo(a.vx, 6)
  expect(b.vy).toBeCloseTo(a.vy, 6)
})

it('settles without overshooting when critically damped or over-damped', () => {
  const critical = fly(START, { x: 300, y: 0 }, 300, { damping: 1 })
  const over = fly(START, { x: 300, y: 0 }, 300, { damping: 1.6 })

  // Without overshoot the head never passes the target on its way there.
  expect(Math.max(...critical.map(motion => motion.x))).toBeLessThanOrEqual(300)
  expect(Math.max(...over.map(motion => motion.x))).toBeLessThanOrEqual(300)
  expect(critical[critical.length - 1].x).toBeCloseTo(300, 1)
  expect(over[over.length - 1].x).toBeCloseTo(300, 0)
})

it('lengthens the trail in flight and draws it back into the head at rest', () => {
  const frames = fly(START, { x: 600, y: 0 }, 300)
  const longest = Math.max(...frames.map(trailLength))

  expect(longest).toBeGreaterThan(200)
  expect(trailLength(frames[frames.length - 1])).toBeLessThan(1)
})

it('draws a longer trail for a farther target', () => {
  const near = Math.max(...fly(START, { x: 150, y: 0 }, 120).map(trailLength))
  const far = Math.max(...fly(START, { x: 600, y: 0 }, 120).map(trailLength))

  expect(far).toBeGreaterThan(near * 2)
})

it('forgets positions older than the memory', () => {
  const frames = fly(START, { x: 600, y: 0 }, 120)
  const last = frames[frames.length - 1]

  expect(last.samples[0]).toEqual({ x: last.x, y: last.y, time: last.now })
  expect(last.samples.every(sample => last.now - sample.time <= OPTIONS.memory)).toBe(true)
  // One sample per frame within the memory, plus the current position.
  expect(last.samples).toHaveLength(Math.floor(OPTIONS.memory / OPTIONS.dt) + 1)
})
