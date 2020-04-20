import {
  equalArrays,
} from '../../util'

it('equalArrays', () => {
  expect(equalArrays([], [])).toBe(true)
  expect(equalArrays(['a', 'b'], ['a', 'b'])).toBe(true)
  expect(!equalArrays([''], ['a'])).toBe(true)
  expect(!equalArrays(['a'], [])).toBe(true)
  expect(!equalArrays(['a', 'b'], ['a', 'b', 'c'])).toBe(true)
  expect(!equalArrays(['a', 'b', 'c'], ['a', 'b'])).toBe(true)
  expect(!equalArrays(['a', 'b'], ['b', 'a'])).toBe(true)
})
