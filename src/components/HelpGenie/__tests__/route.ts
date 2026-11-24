import route from '../route'

const waypoints = [
  { x: 0, y: 0, at: 0 },
  { x: 100, y: 50, at: 1 },
  { x: 200, y: 0, at: 2 },
  { x: 300, y: 80, at: 4 },
]

it('passes through each waypoint at its time', () => {
  const path = route(waypoints)

  waypoints.forEach(({ x, y, at }) => {
    expect(path(at).x).toBeCloseTo(x)
    expect(path(at).y).toBeCloseTo(y)
  })
})

it('holds at the first waypoint before it, and the last after it', () => {
  const path = route(waypoints)

  expect(path(-1)).toEqual({ x: 0, y: 0 })
  expect(path(10)).toEqual({ x: 300, y: 80 })
})

it('curves between waypoints rather than cutting straight across', () => {
  const path = route(waypoints)

  // Halfway from (100, 50) to (200, 0), heading out of the rise towards (0,0)…(100,50) and into the dip after.
  const middle = path(1.5)

  expect(middle.x).toBeCloseTo(150)
  expect(middle.y).not.toBeCloseTo(25)
})
