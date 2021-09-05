import { initialState, reducerFlow } from '../../util'
import { HOME_PATH } from '../../constants'
import { getDescendantPaths } from '../../selectors'
import { importText, newThought } from '../../reducers'
import { SimplePath } from '../../@types'
import rankThoughtsFirstMatch from '../rankThoughtsFirstMatch'
import childIdsToThoughts from '../childIdsToThoughts'

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
  const descendantsAllThoughts = descendantsAll.map(simplePath => childIdsToThoughts(state, simplePath))
  expect(descendantsAllThoughts).toMatchObject([
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

  const descendantsA = getDescendantPaths(state, rankThoughtsFirstMatch(state, ['a']) as SimplePath)
  const descendantsAThoughts = descendantsA.map(simplePath => childIdsToThoughts(state, simplePath))

  expect(descendantsAThoughts).toMatchObject([
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
  const descendantsUnordered = getDescendantPaths(state, HOME_PATH).map(simplePath =>
    childIdsToThoughts(state, simplePath),
  )

  expect(descendantsUnordered).toMatchObject([
    [{ value: 'a', rank: 0 }],
    [{ value: 'b', rank: 1 }],
    [{ value: 'c', rank: 2 }],
    [{ value: 'x', rank: 1.502 }], // rank is nudged towards the next sibling (see getRankBefore)
  ])

  // ordered
  const descendantsOrdered = getDescendantPaths(state, HOME_PATH, { ordered: true }).map(simplePath =>
    childIdsToThoughts(state, simplePath),
  )

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
  }).map(simplePath => childIdsToThoughts(state, simplePath))

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
