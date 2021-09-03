import { isDescendantPath } from '../../util'

it('equal returns true', () => {
  expect(isDescendantPath(['id1'], ['id1'])).toBe(true)
})

it('descendant returns true', () => {
  expect(isDescendantPath(['test-id1', 'test-id2'], ['test-id1'])).toBe(true)
  expect(isDescendantPath(['test-id1', 'test-id2', 'test-id3'], ['test-id1', 'test-id2'])).toBe(true)
})

it('subset returns false', () => {
  expect(isDescendantPath(['id1', 'id2', 'id3'], ['id2', 'id3'])).toBe(false)
})

// it('value mismatch returns false', () => {
//   expect(isDescendantPath([{ id: 'a', value: 'a', rank: 0 }], [{ id: 'b', value: 'b', rank: 0 }])).toBe(false)
// })

// it('rank mismatch returns false', () => {
//   expect(isDescendantPath([{ id: 'a', value: 'a', rank: 0 }], [{ id: 'a', value: 'a', rank: 1 }])).toBe(false)
// })

it('non-contiguous descendant returns false', () => {
  expect(isDescendantPath(['id1', 'id2', 'id3', 'id4'], ['id2', 'id4'])).toBe(false)
})

// TODO: Fix type error here.
it('empty list returns false', () => {
  expect(isDescendantPath([], [])).toBe(false)
  expect(isDescendantPath(['id1'], [])).toBe(false)
})
