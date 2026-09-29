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
