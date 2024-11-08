import SimplePath from '../../@types/SimplePath'
import importText from '../../actions/importText'
import newThought from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import childIdsToThoughts from '../childIdsToThoughts'
import contextToPath from '../contextToPath'
import getDescendantThoughtIds from '../getDescendantThoughtIds'

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

  const steps = [importText({ text }), setCursorFirstMatch(['c']), newThought({ value: 'x', insertBefore: true })]

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

it('filter and continue traversing', () => {
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

  const descendantsAll = childIdsToThoughts(
    state,
    getDescendantThoughtIds(state, HOME_TOKEN, {
      filterFunction: thought => thought.value !== 'protected',
      filterAndTraverse: thought => thought.value !== 'a',
    }),
  )

  expect(descendantsAll).toMatchObject([
    { value: 'b', rank: 0 },
    { value: 'c', rank: 1 },
    { value: 'd', rank: 1 },
    { value: 'e', rank: 0 },
  ])
})
