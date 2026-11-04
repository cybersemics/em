import getGestureBounds from '../getGestureBounds'
import getGestureGeometry from '../getGestureGeometry'

it('uses size as the longest dimension of every undecorated gesture', () => {
  const options = { size: 150, reversalOffset: 45 }
  const geometries = [
    getGestureGeometry('r', options),
    getGestureGeometry('rd', options),
    getGestureGeometry('rdrul', options),
    getGestureGeometry('rul', { ...options, rounded: true }),
    getGestureGeometry('rdld', options),
  ]

  geometries.forEach(geometry => {
    const bounds = getGestureBounds(geometry)
    expect(Math.max(bounds.width, bounds.height)).toBeCloseTo(150)
  })
})

it('scales the question-mark template proportionally to the requested size', () => {
  const small = getGestureBounds(getGestureGeometry('rdld', { size: 50, reversalOffset: 15 }))
  const large = getGestureBounds(getGestureGeometry('rdld', { size: 150, reversalOffset: 45 }))

  expect(small.height).toBeCloseTo(50)
  expect(large.height).toBeCloseTo(150)
  expect(large.width / small.width).toBeCloseTo(3)
})

it('preserves the authored origin of a leftward line', () => {
  const geometry = getGestureGeometry('l', { size: 60, reversalOffset: 18 })

  expect(geometry.segments).toEqual([{ kind: 'line', from: { x: 0, y: 0 }, to: { x: -60, y: 0 }, gestureIndex: 0 }])
})

it('fits multi-turn line gestures to size rather than their net displacement', () => {
  const geometry = getGestureGeometry('rdrul', { size: 48, reversalOffset: 14.4 })

  expect(getGestureBounds(geometry)).toEqual({ x: 0, y: 0, width: 48, height: 24 })
})

it('applies corner softening in the authored coordinate space', () => {
  const geometry = getGestureGeometry('rd', { size: 100, reversalOffset: 30, cornerRadius: 10 })

  expect(geometry.segments[1]).toEqual({
    kind: 'quadratic',
    from: { x: 90, y: 0 },
    control: { x: 100, y: 0 },
    to: { x: 100, y: 10 },
    gestureIndex: 0,
  })
})

it('centers a filled chevron on the gesture end and stops the shaft between its legs', () => {
  const chevron = { apexAngle: 90, halfSpan: 5, filled: true }
  const geometry = getGestureGeometry('r', { size: 100, reversalOffset: 30, chevron })
  /** Rounds away floating-point noise from the apex angle's tangent. */
  const round = (point: { x: number; y: number }) => ({ x: +point.x.toFixed(6), y: +point.y.toFixed(6) })

  expect(geometry.chevron!.map(round)).toEqual([
    { x: 97.5, y: 5 },
    { x: 102.5, y: 0 },
    { x: 97.5, y: -5 },
  ])
  expect(geometry.segments.map(segment => ({ ...segment, to: round(segment.to) }))).toEqual([
    { kind: 'line', from: { x: 0, y: 0 }, to: { x: 97.5, y: 0 }, gestureIndex: 0 },
  ])
})

it('collapses a final line shorter than half the filled chevron instead of reversing it', () => {
  const chevron = { apexAngle: 20, halfSpan: 5, filled: true }
  const geometry = getGestureGeometry('r', { size: 10, reversalOffset: 3, chevron })

  expect(geometry.chevron![1].x).toBeGreaterThan(10)
  expect(geometry.segments[0].to).toEqual({ x: 0, y: 0 })
})

it('omits the filled chevron from the question mark', () => {
  const chevron = { apexAngle: 90, halfSpan: 5, filled: true }
  const geometry = getGestureGeometry('rdld', { size: 50, reversalOffset: 15, chevron })

  expect(geometry.chevron).toBeNull()
  expect(geometry.segments).toEqual(getGestureGeometry('rdld', { size: 50, reversalOffset: 15 }).segments)
})
