import flightPath from '../trail/flightPath'

it('passes through every remembered position and measures distance along the path', () => {
  const samples = [0, 30, 60, 90].map((x, i) => ({ x, y: 0, time: -i }))
  const path = flightPath(samples)

  samples.forEach(sample => expect(path.some(point => point.x === sample.x && point.y === sample.y)).toBe(true))
  expect(path[0].distance).toBe(0)
  expect(path[path.length - 1].distance).toBeCloseTo(90, 6)
})

it('rounds the corner between positions that are far apart', () => {
  // Right along the top, then down: a right-angle corner at (60, 0).
  const samples = [
    { x: 0, y: 0, time: 0 },
    { x: 60, y: 0, time: -1 },
    { x: 60, y: 60, time: -2 },
  ]
  const path = flightPath(samples)

  // Joined with straight lines, every point would lie on the top edge (y = 0) or the right edge (x = 60). The curve
  // leaves both near the corner.
  expect(path.some(point => point.y > 1 && point.x > 60.5)).toBe(true)
  // And it is filled in finely: no step is much longer than CURVE_STEP (6px).
  const steps = path.slice(1).map((point, i) => Math.hypot(point.x - path[i].x, point.y - path[i].y))
  expect(Math.max(...steps)).toBeLessThan(10)
})

it('reduces a head at rest to a single point', () => {
  const samples = Array.from({ length: 20 }, (_, i) => ({ x: 50, y: 50, time: -i }))

  expect(flightPath(samples)).toEqual([{ x: 50, y: 50, distance: 0 }])
})
