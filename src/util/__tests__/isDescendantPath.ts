import { isDescendantPath } from '../../util'
import { createId } from '../createId'

it('equal returns true', () => {
  expect(isDescendantPath([{ id: createId(), value: 'a', rank: 0 }], [{ id: createId(), value: 'a', rank: 0 }])).toBe(
    true,
  )
})

it('descendant returns true', () => {
  expect(
    isDescendantPath(
      [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
      ],
      [{ id: createId(), value: 'a', rank: 0 }],
    ),
  ).toBe(true)
  expect(
    isDescendantPath(
      [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
        { id: createId(), value: 'c', rank: 0 },
      ],
      [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
      ],
    ),
  ).toBe(true)
})

it('subset returns false', () => {
  expect(
    isDescendantPath(
      [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
        { id: createId(), value: 'c', rank: 0 },
      ],
      [
        { id: createId(), value: 'b', rank: 0 },
        { id: createId(), value: 'c', rank: 0 },
      ],
    ),
  ).toBe(false)
})

it('value mismatch returns false', () => {
  expect(isDescendantPath([{ id: createId(), value: 'a', rank: 0 }], [{ id: createId(), value: 'b', rank: 0 }])).toBe(
    false,
  )
})

it('rank mismatch returns false', () => {
  expect(isDescendantPath([{ id: createId(), value: 'a', rank: 0 }], [{ id: createId(), value: 'a', rank: 1 }])).toBe(
    false,
  )
})

it('non-contiguous descendant returns false', () => {
  expect(
    isDescendantPath(
      [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
        { id: createId(), value: 'c', rank: 0 },
        { id: createId(), value: 'd', rank: 0 },
      ],
      [
        { id: createId(), value: 'b', rank: 0 },
        { id: createId(), value: 'd', rank: 0 },
      ],
    ),
  ).toBe(false)
})

it('empty list returns false', () => {
  expect(isDescendantPath([], [])).toBe(false)
  expect(isDescendantPath([{ id: createId(), value: 'a', rank: 0 }], [])).toBe(false)
})
