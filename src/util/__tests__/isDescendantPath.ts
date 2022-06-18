import isDescendantPath from '../../util/isDescendantPath'
import Path from '../../@types/Path'

/** Coerce an array of strings to a Path. */
const asPath = (ids: string[]) => ids as any as Path

it('equal returns true', () => {
  expect(isDescendantPath(asPath(['id1']), asPath(['id1']))).toBe(true)
})

it('descendant returns true', () => {
  expect(isDescendantPath(asPath(['test-id1', 'test-id2']), asPath(['test-id1']))).toBe(true)
  expect(isDescendantPath(asPath(['test-id1', 'test-id2', 'test-id3']), asPath(['test-id1', 'test-id2']))).toBe(true)
})

it('subset returns false', () => {
  expect(isDescendantPath(asPath(['id1', 'id2', 'id3']), asPath(['id2', 'id3']))).toBe(false)
})

// it('value mismatch returns false', () => {
//   expect(isDescendantPath([{ id: 'a', value: 'a', rank: 0 }], [{ id: 'b', value: 'b', rank: 0 }])).toBe(false)
// })

// it('rank mismatch returns false', () => {
//   expect(isDescendantPath([{ id: 'a', value: 'a', rank: 0 }], [{ id: 'a', value: 'a', rank: 1 }])).toBe(false)
// })

it('non-contiguous descendant returns false', () => {
  expect(isDescendantPath(asPath(['id1', 'id2', 'id3', 'id4']), asPath(['id2', 'id4']))).toBe(false)
})

// TODO: Fix type error here.
it('empty list returns false', () => {
  expect(isDescendantPath(asPath([]), asPath([]))).toBe(false)
  expect(isDescendantPath(asPath(['id1']), asPath([]))).toBe(false)
})
