import { head, initialState, reducerFlow } from '../../util'
import { HOME_TOKEN } from '../../constants'
import { getDescendantThoughtIds } from '..'
import { importText, newThought } from '../../reducers'
import { SimplePath } from '../../@types'
import contextToPath from '../contextToPath'
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
  const descendantThoughtIds = getDescendantThoughtIds(state, HOME_TOKEN)
  const descendantsAllThoughts = childIdsToThoughts(state, descendantThoughtIds)

  expect(descendantsAllThoughts).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
    { value: 'c', rank: 0 },
    { value: 'd', rank: 1 },
    { value: 'e', rank: 1 },
    { value: 'f', rank: 0 },
  ])

  const descendantsIdsOfA = getDescendantThoughtIds(state, head(contextToPath(state, ['a']) as SimplePath))
  const descendantsAThoughts = childIdsToThoughts(state, descendantsIdsOfA)

  expect(descendantsAThoughts).toMatchObject([
    { value: 'b', rank: 0 },
    { value: 'c', rank: 0 },
    { value: 'd', rank: 1 },
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
  const descendantsUnordered = childIdsToThoughts(state, getDescendantThoughtIds(state, HOME_TOKEN))

  expect(descendantsUnordered).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'c', rank: 2 },
    { value: 'x', rank: 1.502 }, // rank is nudged towards the next sibling (see getRankBefore)
  ])

  // ordered
  const descendantsOrdered = childIdsToThoughts(state, getDescendantThoughtIds(state, HOME_TOKEN, { ordered: true }))

  expect(descendantsOrdered).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'x', rank: 1.502 }, // rank is nudged towards the next sibling (see getRankBefore)
    { value: 'c', rank: 2 },
  ])
})

it('filter descendants', () => {
  const text = `
    - a
      - b
        - protected
          - content
      - c
    - d
      - e
        - protected
          - f
  `
  const state = importText({ text })(initialState())
  let touched = 0

  const descendantsAll = childIdsToThoughts(
    state,
    getDescendantThoughtIds(state, HOME_TOKEN, {
      // context does not include child
      filterFunction: thought => {
        touched++
        return thought.value !== 'protected'
      },
    }),
  )

  expect(descendantsAll).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
    { value: 'c', rank: 1 },
    { value: 'd', rank: 1 },
    { value: 'e', rank: 0 },
  ])

  // short circuit
  // [e, f, g, h] should never be touched
  expect(touched).toEqual(7)
})
