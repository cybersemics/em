import {
  reduceObj,
} from '../../util'

it('basic', () => {
  expect(
    reduceObj({ a: 1, b: 2, c: 3 }, (key, val) => ({
      [key + key]: val * val
    }))
  ).toEqual({
    aa: 1,
    bb: 4,
    cc: 9
  })
})

it('return multiple key-value pairs', () => {
  expect(
    reduceObj({ a: 1, b: 2, c: 3 }, (key, val) => ({
      [key + 'x']: val + 1,
      [key + 'y']: val * 2,
    }))
  ).toEqual({
    ax: 2,
    ay: 2,
    bx: 3,
    by: 4,
    cx: 4,
    cy: 6
  })
})
