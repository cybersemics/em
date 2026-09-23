import getGestureBounds from '../getGestureBounds'
import GestureGeometry from '../types/GestureGeometry'

const empty: GestureGeometry = { path: '', extendedPath: '', segments: [], chevron: null }

it('includes line endpoints and chevron points in the bounds', () => {
  expect(
    getGestureBounds({
      ...empty,
      segments: [{ kind: 'line', from: { x: -5, y: 2 }, to: { x: 10, y: 2 }, gestureIndex: 0 }],
      chevron: [
        { x: 8, y: -3 },
        { x: 14, y: 2 },
        { x: 8, y: 7 },
      ],
    }),
  ).toEqual({ x: -5, y: -3, width: 19, height: 10 })
})

it('uses the quadratic extrema rather than the control point', () => {
  const bounds = getGestureBounds({
    ...empty,
    segments: [
      { kind: 'quadratic', from: { x: 0, y: 0 }, control: { x: 10, y: 20 }, to: { x: 0, y: 10 }, gestureIndex: 0 },
    ],
  })

  expect(bounds.x).toBe(0)
  expect(bounds.y).toBe(0)
  expect(bounds.width).toBe(5)
  expect(bounds.height).toBeCloseTo(40 / 3)
})

it('handles a quadratic whose derivative is constant', () => {
  expect(
    getGestureBounds({
      ...empty,
      segments: [
        { kind: 'quadratic', from: { x: 0, y: 0 }, control: { x: 5, y: 5 }, to: { x: 10, y: 10 }, gestureIndex: 0 },
      ],
    }),
  ).toEqual({ x: 0, y: 0, width: 10, height: 10 })
})

it('ignores quadratic extrema outside the segment', () => {
  expect(
    getGestureBounds({
      ...empty,
      segments: [
        { kind: 'quadratic', from: { x: 0, y: 0 }, control: { x: 5, y: 5 }, to: { x: 20, y: 20 }, gestureIndex: 0 },
      ],
    }),
  ).toEqual({ x: 0, y: 0, width: 20, height: 20 })
})

it('includes the swept arc extremum when crossing zero degrees', () => {
  const diagonal = 10 * Math.SQRT1_2
  const bounds = getGestureBounds({
    ...empty,
    segments: [
      {
        kind: 'arc',
        from: { x: diagonal, y: -diagonal },
        to: { x: diagonal, y: diagonal },
        center: { x: 0, y: 0 },
        radius: 10,
        startAngle: 315,
        endAngle: 405,
        sweepFlag: 1,
        gestureIndex: 0,
      },
    ],
  })

  expect(bounds.x).toBeCloseTo(diagonal)
  expect(bounds.y).toBeCloseTo(-diagonal)
  expect(bounds.width).toBeCloseTo(10 - diagonal)
  expect(bounds.height).toBeCloseTo(2 * diagonal)
})

it('includes extrema within a counterclockwise sweep without bounding the whole circle', () => {
  const diagonal = 10 * Math.SQRT1_2
  const bounds = getGestureBounds({
    ...empty,
    segments: [
      {
        kind: 'arc',
        from: { x: 3 - diagonal, y: 5 + diagonal },
        to: { x: 3 + diagonal, y: 5 + diagonal },
        center: { x: 3, y: 5 },
        radius: 10,
        startAngle: 135,
        endAngle: 45,
        sweepFlag: 0,
        gestureIndex: 0,
      },
    ],
  })

  expect(bounds.x).toBeCloseTo(3 - diagonal)
  expect(bounds.y).toBeCloseTo(5 + diagonal)
  expect(bounds.width).toBeCloseTo(2 * diagonal)
  expect(bounds.height).toBeCloseTo(10 - diagonal)
})

it('measures the authored rdld centerline as 36.3 by 67.5', () => {
  const bounds = getGestureBounds({
    path: 'rdld',
    extendedPath: 'rdld',
    chevron: null,
    segments: [
      {
        kind: 'quadratic',
        from: { x: 29.7, y: 13.5 },
        control: { x: 46.8, y: -4.5 },
        to: { x: 63, y: 13.5 },
        gestureIndex: 0,
      },
      {
        kind: 'quadratic',
        from: { x: 63, y: 13.5 },
        control: { x: 72, y: 27 },
        to: { x: 54, y: 40.5 },
        gestureIndex: 1,
      },
      {
        kind: 'quadratic',
        from: { x: 54, y: 40.5 },
        control: { x: 45, y: 49.5 },
        to: { x: 45, y: 58.5 },
        gestureIndex: 2,
      },
      { kind: 'line', from: { x: 45, y: 58.5 }, to: { x: 45, y: 72 }, gestureIndex: 3 },
    ],
  })

  expect(bounds.x).toBeCloseTo(29.7)
  expect(bounds.y).toBeCloseTo(4.5)
  expect(bounds.width).toBeCloseTo(36.3)
  expect(bounds.height).toBeCloseTo(67.5)
})

it('returns finite zero bounds for empty geometry', () => {
  expect(getGestureBounds(empty)).toEqual({ x: 0, y: 0, width: 0, height: 0 })
})
