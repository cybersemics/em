import sampleCurve from '../sampleCurve'

const curve: [number, number, number][] = [
  [0, 0, 10],
  [1, 10, 20],
  [3, 30, 0],
]

it('joins samples with straight lines', () => {
  expect(sampleCurve(curve, 0.5)).toEqual([0.5, 5, 15])
  expect(sampleCurve(curve, 2)).toEqual([2, 20, 10])
})

it('holds at the first sample before it and the last after it', () => {
  expect(sampleCurve(curve, -1)).toEqual([0, 0, 10])
  expect(sampleCurve(curve, 9)).toEqual([3, 30, 0])
})
