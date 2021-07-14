import { isDescendantPath } from '../../util'
import { hashContext } from '../hashContext'

it('equal returns true', () => {
  expect(
    isDescendantPath(
      [{ id: hashContext(['a']), value: 'a', rank: 0 }],
      [{ id: hashContext(['a']), value: 'a', rank: 0 }],
    ),
  ).toBe(true)
})

it('descendant returns true', () => {
  expect(
    isDescendantPath(
      [
        { id: hashContext(['a']), value: 'a', rank: 0 },
        { id: hashContext(['a', 'b']), value: 'b', rank: 0 },
      ],
      [{ id: hashContext(['a']), value: 'a', rank: 0 }],
    ),
  ).toBe(true)
  expect(
    isDescendantPath(
      [
        { id: hashContext(['a']), value: 'a', rank: 0 },
        { id: hashContext(['a', 'b']), value: 'b', rank: 0 },
        { id: hashContext(['a', 'b', 'c']), value: 'c', rank: 0 },
      ],
      [
        { id: hashContext(['a']), value: 'a', rank: 0 },
        { id: hashContext(['a', 'b']), value: 'b', rank: 0 },
      ],
    ),
  ).toBe(true)
})

it('subset returns false', () => {
  expect(
    isDescendantPath(
      [
        { id: hashContext(['a']), value: 'a', rank: 0 },
        { id: hashContext(['a', 'b']), value: 'b', rank: 0 },
        { id: hashContext(['a', 'b', 'c']), value: 'c', rank: 0 },
      ],
      [
        { id: hashContext(['b']), value: 'b', rank: 0 },
        { id: hashContext(['b', 'c']), value: 'c', rank: 0 },
      ],
    ),
  ).toBe(false)
})

it('value mismatch returns false', () => {
  expect(
    isDescendantPath(
      [{ id: hashContext(['a']), value: 'a', rank: 0 }],
      [{ id: hashContext(['b']), value: 'b', rank: 0 }],
    ),
  ).toBe(false)
})

it('rank mismatch returns false', () => {
  expect(
    isDescendantPath(
      [{ id: hashContext(['a']), value: 'a', rank: 0 }],
      [{ id: hashContext(['a']), value: 'a', rank: 1 }],
    ),
  ).toBe(false)
})

it('non-contiguous descendant returns false', () => {
  expect(
    isDescendantPath(
      [
        { id: hashContext(['a']), value: 'a', rank: 0 },
        { id: hashContext(['a', 'b']), value: 'b', rank: 0 },
        { id: hashContext(['a', 'b', 'c']), value: 'c', rank: 0 },
        { id: hashContext(['a', 'b', 'c', 'd']), value: 'd', rank: 0 },
      ],
      [
        { id: hashContext(['b']), value: 'b', rank: 0 },
        { id: hashContext(['b', 'd']), value: 'd', rank: 0 },
      ],
    ),
  ).toBe(false)
})

it('empty list returns false', () => {
  expect(isDescendantPath([], [])).toBe(false)
  expect(isDescendantPath([{ id: hashContext(['a']), value: 'a', rank: 0 }], [])).toBe(false)
})
