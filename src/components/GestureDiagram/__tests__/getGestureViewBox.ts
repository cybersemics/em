import getGestureBounds from '../getGestureBounds'
import getGestureGeometry from '../getGestureGeometry'
import getGestureViewBox from '../getGestureViewBox'
import GestureGeometry from '../types/GestureGeometry'

const geometry: GestureGeometry = {
  path: 'r',
  extendedPath: 'r',
  segments: [{ kind: 'line', from: { x: -5, y: 2 }, to: { x: 45, y: 2 }, gestureIndex: 0 }],
  chevron: null,
}

it('reserves a square frame for conventional markers', () => {
  expect(getGestureViewBox(geometry, { arrowSize: 10, arrowhead: 'filled', strokeWidth: 2, size: 50 })).toBe(
    '-23 -41 86 86',
  )
})

it('includes the actual stroke radius when no arrowhead is requested', () => {
  expect(getGestureViewBox(geometry, { arrowSize: 10, arrowhead: 'none', strokeWidth: 2, size: 50 })).toBe(
    '-6.5 -24.5 53 53',
  )
})

it('uses bounds to center each shape without changing its scale', () => {
  const options = { size: 150, arrowSize: 1, arrowhead: 'outlined-wide' as const, strokeWidth: 12 }
  const geometries = [
    getGestureGeometry('r', { size: 150, reversalOffset: 45 }),
    getGestureGeometry('rul', { size: 150, reversalOffset: 45, rounded: true }),
    getGestureGeometry('rdld', { size: 150, reversalOffset: 45 }),
  ]
  const frames = geometries.map(geometry => getGestureViewBox(geometry, options).split(' ').map(Number))

  frames.forEach(([x, y, width, height], index) => {
    const bounds = getGestureBounds(geometries[index])
    expect(width).toBe(frames[0][2])
    expect(height).toBe(width)
    expect(x + width / 2).toBeCloseTo(bounds.x + bounds.width / 2)
    expect(y + height / 2).toBeCloseTo(bounds.y + bounds.height / 2)
  })
})

it('reserves room for large acute chevrons without changing the scale of arrowhead-free glyphs', () => {
  const options = {
    size: 50,
    arrowSize: 1,
    arrowhead: 'outlined-wide' as const,
    strokeWidth: 2,
    chevronSize: 8,
    chevronApexAngle: 20,
  }
  const chevron = { apexAngle: 20, halfSpan: 24 }
  const curved = getGestureGeometry('rul', { size: 50, reversalOffset: 15, rounded: true, chevron })
  const glyph = getGestureGeometry('rdld', { size: 50, reversalOffset: 15, chevron })
  const bounds = getGestureBounds(curved)
  const [x, y, width, height] = getGestureViewBox(curved, options).split(' ').map(Number)

  expect(getGestureViewBox(glyph, options).split(' ').map(Number).slice(2)).toEqual([width, height])
  expect(bounds.x - 1.5).toBeGreaterThanOrEqual(x)
  expect(bounds.y - 1.5).toBeGreaterThanOrEqual(y)
  expect(bounds.x + bounds.width + 1.5).toBeLessThanOrEqual(x + width)
  expect(bounds.y + bounds.height + 1.5).toBeLessThanOrEqual(y + height)
})
