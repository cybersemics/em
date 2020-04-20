import {
  subsetThoughts,
} from '../../util'

it('equal returns true', () => {
  expect(subsetThoughts([{ value: 'a', rank: 0 }], [{ value: 'a', rank: 0 }])).toBe(true)
})

it('subset returns true', () => {
  expect(subsetThoughts([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }], [{ value: 'a', rank: 0 }])).toBe(true)
  expect(subsetThoughts([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }], [{ value: 'b', rank: 0 }, { value: 'c', rank: 0 }])).toBe(true)
})

it('value mismatch returns false', () => {
  expect(subsetThoughts([{ value: 'a', rank: 0 }], [{ value: 'b', rank: 0 }])).toBe(false)
})

it('rank mismatch returns false', () => {
  expect(subsetThoughts([{ value: 'a', rank: 0 }], [{ value: 'a', rank: 1 }])).toBe(false)
})

it('non-contiguous subset returns false', () => {
  expect(subsetThoughts([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }, { value: 'd', rank: 0 }], [{ value: 'b', rank: 0 }, { value: 'd', rank: 0 }])).toBe(false)
})

it('empty list returns false', () => {
  expect(subsetThoughts([], [])).toBe(false)
  expect(subsetThoughts([{ value: 'a', rank: 0 }], [])).toBe(false)
})
