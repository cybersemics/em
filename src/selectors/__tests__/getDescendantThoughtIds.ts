import SimplePath from '../../@types/SimplePath'
import importText from '../../actions/importText'
import newThought from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import head from '../../util/head'
import initialState from '../../util/initialState'
import childIdsToThoughts from '../childIdsToThoughts'
import contextToPath from '../contextToPath'
import getDescendantThoughtIds from '../getDescendantThoughtIds'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

/** Tests thought values without asserting order. */
const expectThoughtsUnordered = (thoughts: { value: string }[], values: string[]) => {
  const thoughtValues = thoughts.map(thought => thought.value)
  expect(thoughtValues).toHaveLength(values.length)
  expect(thoughtValues).toEqual(expect.arrayContaining(values))
}

it('get descendants', () => {
  const text = `
    - a
      - b
        - c
      - d
    - e
      - f
  `
  const state = runDocumentCommand(importText({ text }), initialState())
  const descendantThoughtIds = getDescendantThoughtIds(state, HOME_TOKEN)
  const descendantsAllThoughts = childIdsToThoughts(state, descendantThoughtIds)

  expectThoughtsUnordered(descendantsAllThoughts, ['a', 'b', 'c', 'd', 'e', 'f'])

  const descendantsIdsOfA = getDescendantThoughtIds(state, head(contextToPath(state, ['a']) as SimplePath))
  const descendantsAThoughts = childIdsToThoughts(state, descendantsIdsOfA)

  expectThoughtsUnordered(descendantsAThoughts, ['b', 'c', 'd'])
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

  expectThoughtsUnordered(descendantsUnordered, ['a', 'b', 'c', 'x'])

  // ordered
  const descendantsOrdered = childIdsToThoughts(state, getDescendantThoughtIds(state, HOME_TOKEN, { ordered: true }))

  expect(descendantsOrdered.map(thought => thought.value)).toEqual(['a', 'b', 'x', 'c'])
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
  const state = runDocumentCommand(importText({ text }), initialState())
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

  expectThoughtsUnordered(descendantsAll, ['a', 'b', 'c', 'd', 'e'])

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
  const state = runDocumentCommand(importText({ text }), initialState())

  const descendantsAll = childIdsToThoughts(
    state,
    getDescendantThoughtIds(state, HOME_TOKEN, {
      filterFunction: thought => thought.value !== 'protected',
      filterAndTraverse: thought => thought.value !== 'a',
    }),
  )

  expectThoughtsUnordered(descendantsAll, ['b', 'c', 'd', 'e'])
})
