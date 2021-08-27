import { initialState, reducerFlow } from '../../util'
import { HOME_PATH } from '../../constants'
import { getDescendantPaths } from '../../selectors'
import { importText, newThought } from '../../reducers'
import { SimplePath } from '../../@types'

it('get descendants', () => {
  const text = `
    - a
      - b
        - c
      - d
    - e
      - f
  `
  const state = importText({ text })(initialState())
  const descendantsAll = getDescendantPaths(state, HOME_PATH)
  expect(descendantsAll).toMatchObject([
    [{ value: 'a', rank: 0 }],
    [
      { value: 'a', rank: 0 },
      { value: 'b', rank: 0 },
    ],
    [
      { value: 'a', rank: 0 },
      { value: 'b', rank: 0 },
      { value: 'c', rank: 0 },
    ],
    [
      { value: 'a', rank: 0 },
      { value: 'd', rank: 1 },
    ],
    [{ value: 'e', rank: 1 }],
    [
      { value: 'e', rank: 1 },
      { value: 'f', rank: 0 },
    ],
  ])

  const descendantsA = getDescendantPaths(state, [{ value: 'a', rank: 0 }] as SimplePath)
  expect(descendantsA).toMatchObject([
    [
      { value: 'a', rank: 0 },
      { value: 'b', rank: 0 },
    ],
    [
      { value: 'a', rank: 0 },
      { value: 'b', rank: 0 },
      { value: 'c', rank: 0 },
    ],
    [
      { value: 'a', rank: 0 },
      { value: 'd', rank: 1 },
    ],
  ])
})

it('get descendants ordered by rank', () => {
  const text = `
    - a
    - b
    - c
  `

  const steps = [importText({ text }), newThought({ value: 'x', insertBefore: true })]

  const state = reducerFlow(steps)(initialState())

  // unordered
  const descendantsUnordered = getDescendantPaths(state, HOME_PATH)
  expect(descendantsUnordered).toMatchObject([
    [{ value: 'a', rank: 0 }],
    [{ value: 'b', rank: 1 }],
    [{ value: 'c', rank: 2 }],
    [{ value: 'x', rank: 1.502 }], // rank is nudged towards the next sibling (see getRankBefore)
  ])

  // ordered
  const descendantsOrdered = getDescendantPaths(state, HOME_PATH, { ordered: true })
  expect(descendantsOrdered).toMatchObject([
    [{ value: 'a', rank: 0 }],
    [{ value: 'b', rank: 1 }],
    [{ value: 'x', rank: 1.502 }], // rank is nudged towards the next sibling (see getRankBefore)
    [{ value: 'c', rank: 2 }],
  ])
})

it('filter descendants', () => {
  const text = `
    - a
      - b
        - c
      - d
    - e
      - f
        - g
          - h
  `
  const state = importText({ text })(initialState())
  let touched = 0
  const descendantsAll = getDescendantPaths(state, HOME_PATH, {
    // context does not include child
    filterFunction: (child, context) => {
      touched++
      return context.length < 2
    },
  })
  expect(descendantsAll).toMatchObject([
    [{ value: 'a', rank: 0 }],
    [
      { value: 'a', rank: 0 },
      { value: 'b', rank: 0 },
    ],
    [
      { value: 'a', rank: 0 },
      { value: 'd', rank: 1 },
    ],
    [{ value: 'e', rank: 1 }],
    [
      { value: 'e', rank: 1 },
      { value: 'f', rank: 0 },
    ],
  ])

  // short circuit
  // [e, f, g, h] should never be touched
  expect(touched).toEqual(7)
})
