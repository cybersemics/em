import getGestureViewBox from '../getGestureViewBox'
import GestureGeometry from '../types/GestureGeometry'

const geometry: GestureGeometry = {
  path: 'r',
  extendedPath: 'r',
  segments: [{ kind: 'line', from: { x: -5, y: 2 }, to: { x: 45, y: 2 }, gestureIndex: 0 }],
  chevron: null,
}

it('preserves the conventional filled-marker padding rule', () => {
  expect(getGestureViewBox(geometry, { arrowSize: 10, arrowhead: 'filled', strokeWidth: 2 })).toBe('-23 -12 116 28')
})

it('preserves the conventional outlined-marker padding rule', () => {
  expect(getGestureViewBox(geometry, { arrowSize: 10, arrowhead: 'outlined', strokeWidth: 2 })).toBe('-23 -12 86 28')
})

it('preserves the arrowhead-free padding rule', () => {
  expect(getGestureViewBox(geometry, { arrowSize: 10, arrowhead: 'none', strokeWidth: 2 })).toBe('-6 1 52 2')
})

it('includes the chevron while preserving default outlined-marker padding', () => {
  expect(
    getGestureViewBox(
      {
        ...geometry,
        chevron: [
          { x: 40, y: -8 },
          { x: 55, y: 2 },
          { x: 40, y: 12 },
        ],
      },
      { arrowSize: 10, arrowhead: 'outlined-wide', strokeWidth: 2 },
    ),
  ).toBe('-23 -22 96 48')
})
