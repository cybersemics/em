import getGestureBounds from '../getGestureBounds'
import getGestureGeometry from '../getGestureGeometry'

it('preserves the authored rdld size independently of the requested display size', () => {
  const small = getGestureGeometry('rdld', { size: 48, reversalOffset: 14.4 })
  const large = getGestureGeometry('rdld', { size: 150, reversalOffset: 45 })
  const bounds = getGestureBounds(small)

  expect(bounds.x).toBeCloseTo(29.7)
  expect(bounds.y).toBeCloseTo(4.5)
  expect(bounds.width).toBeCloseTo(36.3)
  expect(bounds.height).toBeCloseTo(67.5)
  expect(large.segments).toEqual(small.segments)
})

it('preserves the legacy circular radius and center', () => {
  const geometry = getGestureGeometry('rul', { size: 48, reversalOffset: 14.4, rounded: true })
  const first = geometry.segments[0]

  expect(first.kind).toBe('arc')
  if (first.kind !== 'arc') throw new Error('Expected a circular arc.')
  expect(first.radius).toBeCloseTo(19.2)
  expect(first.center).toEqual({ x: 50, y: 50 })
})

it('preserves the authored origin of a leftward line', () => {
  const geometry = getGestureGeometry('l', { size: 60, reversalOffset: 18 })

  expect(geometry.segments).toEqual([{ kind: 'line', from: { x: 0, y: 0 }, to: { x: -60, y: 0 }, gestureIndex: 0 }])
})

it('retains the existing per-direction sizing of multi-turn line gestures', () => {
  const geometry = getGestureGeometry('rdrul', { size: 48, reversalOffset: 14.4 })

  expect(getGestureBounds(geometry)).toEqual({ x: 0, y: 0, width: 96, height: 48 })
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

it('normalizes curves to the requested extent only when uniform sizing is selected', () => {
  const options = { size: 150, reversalOffset: 45, sizing: 'uniform' as const }
  const circular = getGestureBounds(getGestureGeometry('rul', { ...options, rounded: true }))
  const glyph = getGestureBounds(getGestureGeometry('rdld', options))

  expect(circular.x).toBeCloseTo(0)
  expect(circular.y).toBeCloseTo(0)
  expect(circular.width).toBeCloseTo(75)
  expect(circular.height).toBeCloseTo(150)
  expect(glyph.x).toBeCloseTo(0)
  expect(glyph.y).toBeCloseTo(0)
  expect(glyph.width).toBeCloseTo((36.3 / 67.5) * 150)
  expect(glyph.height).toBeCloseTo(150)
})
