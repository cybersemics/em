import { isDescendantPath } from '../../util'

it('equal returns true', () => {
  expect(isDescendantPath([{ id: '1', value: 'a', rank: 0 }], [{ id: '2', value: 'a', rank: 0 }])).toBe(true)
})

it('descendant returns true', () => {
  expect(
    isDescendantPath(
      [
        { id: 'a', value: 'a', rank: 0 },
        { id: 'b', value: 'b', rank: 0 },
      ],
      [{ id: 'a', value: 'a', rank: 0 }],
    ),
  ).toBe(true)
  expect(
    isDescendantPath(
      [
        { id: 'a', value: 'a', rank: 0 },
        { id: 'b', value: 'b', rank: 0 },
        { id: 'c', value: 'c', rank: 0 },
      ],
      [
        { id: 'a', value: 'a', rank: 0 },
        { id: 'b', value: 'b', rank: 0 },
      ],
    ),
  ).toBe(true)
})

it('subset returns false', () => {
  expect(
    isDescendantPath(
      [
        { id: 'a', value: 'a', rank: 0 },
        { id: 'b', value: 'b', rank: 0 },
        { id: 'c', value: 'c', rank: 0 },
      ],
      [
        { id: 'b', value: 'b', rank: 0 },
        { id: 'b', value: 'c', rank: 0 },
      ],
    ),
  ).toBe(false)
})

it('value mismatch returns false', () => {
  expect(isDescendantPath([{ id: 'a', value: 'a', rank: 0 }], [{ id: 'b', value: 'b', rank: 0 }])).toBe(false)
})

it('rank mismatch returns false', () => {
  expect(isDescendantPath([{ id: 'a', value: 'a', rank: 0 }], [{ id: 'a', value: 'a', rank: 1 }])).toBe(false)
})

it('non-contiguous descendant returns false', () => {
  expect(
    isDescendantPath(
      [
        { id: 'a', value: 'a', rank: 0 },
        { id: 'a', value: 'b', rank: 0 },
        { id: 'a', value: 'c', rank: 0 },
        { id: 'a', value: 'd', rank: 0 },
      ],
      [
        { id: 'b', value: 'b', rank: 0 },
        { id: 'b', value: 'd', rank: 0 },
      ],
    ),
  ).toBe(false)
})

// TODO: Fix type error here.
it('empty list returns false', () => {
  expect(isDescendantPath([], [])).toBe(false)
  expect(isDescendantPath([{ id: 'a', value: 'a', rank: 0 }], [])).toBe(false)
})
