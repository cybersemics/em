import getGestureBounds from '../getGestureBounds'
import getGestureGeometry from '../getGestureGeometry'

it('normalizes the rdld curve using its actual extrema', () => {
  const geometry = getGestureGeometry('rdld', { size: 150, reversalOffset: 45 })
  const first = geometry.segments[0]

  expect(first.kind).toBe('quadratic')
  if (first.kind !== 'quadratic') throw new Error('Expected the first rdld segment to be quadratic.')
  expect(first.from.x).toBeCloseTo(0)
  expect(first.from.y).toBeCloseTo(20)
  expect(first.control.y).toBeCloseTo(-20)
  expect(first.to.y).toBeCloseTo(20)
  expect((first.from.y + 2 * first.control.y + first.to.y) / 4).toBeCloseTo(0)
  expect(geometry.segments.at(-1)!.to.y).toBeCloseTo(150)
})

it('fits a circular gesture to the requested nominal extent', () => {
  const geometry = getGestureGeometry('rul', { size: 150, reversalOffset: 45, rounded: true })
  const bounds = getGestureBounds(geometry)

  expect(bounds.x).toBeCloseTo(0)
  expect(bounds.y).toBeCloseTo(0)
  expect(bounds.width).toBeCloseTo(75)
  expect(bounds.height).toBeCloseTo(150)
})

it('preserves direction while placing line geometry at the origin', () => {
  const geometry = getGestureGeometry('l', { size: 60, reversalOffset: 18 })

  expect(geometry.segments).toEqual([{ kind: 'line', from: { x: 60, y: 0 }, to: { x: 0, y: 0 }, gestureIndex: 0 }])
})

it('retains the existing per-direction sizing of multi-turn line gestures', () => {
  const geometry = getGestureGeometry('rdrul', { size: 48, reversalOffset: 14.4 })

  expect(getGestureBounds(geometry)).toEqual({ x: 0, y: 0, width: 96, height: 48 })
})

it('keeps previously built glyphs unchanged when another size is requested', () => {
  const small = getGestureGeometry('rdld', { size: 50, reversalOffset: 15 })
  const large = getGestureGeometry('rdld', { size: 150, reversalOffset: 45 })

  expect(small.segments.at(-1)!.to.y).toBeCloseTo(50)
  expect(large.segments.at(-1)!.to.y).toBeCloseTo(150)
})

it('applies corner softening in the normalized coordinate space', () => {
  const geometry = getGestureGeometry('rd', { size: 100, reversalOffset: 30, cornerRadius: 10 })

  expect(geometry.segments[1]).toEqual({
    kind: 'quadratic',
    from: { x: 90, y: 0 },
    control: { x: 100, y: 0 },
    to: { x: 100, y: 10 },
    gestureIndex: 0,
  })
})
