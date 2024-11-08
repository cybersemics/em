import Path from '../../@types/Path'
import { HOME_PATH } from '../../constants'
import isDescendantPath from '../../util/isDescendantPath'

/** Coerce an array of strings to a Path. */
const asPath = (ids: string[]) => ids as any as Path

it('equal paths return true by default', () => {
  expect(isDescendantPath(asPath([]), asPath([]))).toBe(true)
  expect(isDescendantPath(asPath(['a']), asPath(['a']))).toBe(true)
})

it('equal paths return false if exclusive is specified', () => {
  expect(isDescendantPath(asPath([]), asPath([]), { exclusive: true })).toBe(false)
  expect(isDescendantPath(asPath(['a']), asPath(['a']), { exclusive: true })).toBe(false)
})

it('a child is a descendant of a parent', () => {
  expect(isDescendantPath(asPath(['a', 'c']), asPath(['a']))).toBe(true)
  expect(isDescendantPath(asPath(['a', 'c', 'c']), asPath(['a', 'c']))).toBe(true)
})

it('a child is a descendant of a grandparent', () => {
  expect(isDescendantPath(asPath(['a', 'c', 'c']), asPath(['a']))).toBe(true)
})

it('a parent is not a descendant of a child', () => {
  expect(isDescendantPath(asPath(['a', 'c', 'id3']), asPath(['c', 'id3']))).toBe(false)
})

it('non-contiguous descendant returns false', () => {
  expect(isDescendantPath(asPath(['a', 'c', 'id3', 'd']), asPath(['c', 'd']))).toBe(false)
})

it('all thoughts descend from the root', () => {
  expect(isDescendantPath(asPath(['a', 'b', 'c']), HOME_PATH)).toBe(true)
  expect(isDescendantPath(asPath(['a', 'b']), HOME_PATH)).toBe(true)
  expect(isDescendantPath(asPath(['a']), HOME_PATH)).toBe(true)
})

it('the root descends from no thought', () => {
  expect(isDescendantPath(HOME_PATH, asPath(['a', 'b', 'c']))).toBe(false)
  expect(isDescendantPath(HOME_PATH, asPath(['a', 'b']))).toBe(false)
  expect(isDescendantPath(HOME_PATH, asPath(['a']))).toBe(false)
})
