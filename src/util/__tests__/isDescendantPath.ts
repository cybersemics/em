import { isDescendantPath } from '../../util'

it('equal returns true', () => {
  expect(isDescendantPath([{ value: 'a', rank: 0 }], [{ value: 'a', rank: 0 }])).toBe(true)
})

it('descendant returns true', () => {
  expect(isDescendantPath([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }], [{ value: 'a', rank: 0 }])).toBe(true)
  expect(isDescendantPath([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }], [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])).toBe(true)
})

it('subset returns false', () => {
  expect(isDescendantPath([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }], [{ value: 'b', rank: 0 }, { value: 'c', rank: 0 }])).toBe(false)
})

it('value mismatch returns false', () => {
  expect(isDescendantPath([{ value: 'a', rank: 0 }], [{ value: 'b', rank: 0 }])).toBe(false)
})

it('rank mismatch returns false', () => {
  expect(isDescendantPath([{ value: 'a', rank: 0 }], [{ value: 'a', rank: 1 }])).toBe(false)
})

it('non-contiguous descendant returns false', () => {
  expect(isDescendantPath([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }, { value: 'd', rank: 0 }], [{ value: 'b', rank: 0 }, { value: 'd', rank: 0 }])).toBe(false)
})

it('empty list returns false', () => {
  expect(isDescendantPath([], [])).toBe(false)
  expect(isDescendantPath([{ value: 'a', rank: 0 }], [])).toBe(false)
})
