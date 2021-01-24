import { descendantThoughts } from '../../util'

it('equal returns true', () => {
  expect(descendantThoughts([{ value: 'a', rank: 0 }], [{ value: 'a', rank: 0 }])).toBe(true)
})

it('descendant returns true', () => {
  expect(descendantThoughts([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }], [{ value: 'a', rank: 0 }])).toBe(true)
  expect(descendantThoughts([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }], [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])).toBe(true)
})

it('subset returns false', () => {
  expect(descendantThoughts([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }], [{ value: 'a', rank: 0 }])).toBe(true)
  expect(descendantThoughts([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }], [{ value: 'b', rank: 0 }, { value: 'c', rank: 0 }])).toBe(false)
})

it('value mismatch returns false', () => {
  expect(descendantThoughts([{ value: 'a', rank: 0 }], [{ value: 'b', rank: 0 }])).toBe(false)
})

it('rank mismatch returns false', () => {
  expect(descendantThoughts([{ value: 'a', rank: 0 }], [{ value: 'a', rank: 1 }])).toBe(false)
})

it('non-contiguous descendant returns false', () => {
  expect(descendantThoughts([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }, { value: 'd', rank: 0 }], [{ value: 'b', rank: 0 }, { value: 'd', rank: 0 }])).toBe(false)
})

it('empty list returns false', () => {
  expect(descendantThoughts([], [])).toBe(false)
  expect(descendantThoughts([{ value: 'a', rank: 0 }], [])).toBe(false)
})
