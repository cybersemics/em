import { NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'
import { importText } from '../../action-creators'
import { existingThoughtMove, newThought, setCursor, updateThoughts } from '../../reducers'

it('move within root', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - b
  - a`)

})

it('move within context', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a2' }),
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: -1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a2
    - a1`)

})

it('move across contexts', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'b', at: [{ value: 'a', rank: 0 }] }),
    state => newThought(state, { value: 'b1', insertNewSubthought: true }),
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'b', rank: 0 }, { value: 'b1', rank: 0 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'b1', rank: 1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a1
    - b1
  - b`)

})

it('move descendants', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a1.1', insertNewSubthought: true }),
    state => newThought(state, { value: 'b', at: [{ value: 'a', rank: 0 }] }),
    state => newThought(state, { value: 'b1', insertNewSubthought: true }),
    state => newThought(state, { value: 'b1.1', insertNewSubthought: true }),
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - b
    - b1
      - b1.1
  - a
    - a1
      - a1.1`)

})

it('moving cursor thought should update cursor', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a2' }),
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: -1 }],
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }, { value: 'a2', rank: -1 }])

})

it('moving ancestor of cursor should update cursor', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => newThought(state, { value: 'b1', insertNewSubthought: true }),
    state => newThought(state, { value: 'b1.1', insertNewSubthought: true }),
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    }),

  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'b', rank: -1 }, { value: 'b1', rank: 0 }, { value: 'b1.1', rank: 0 }])

})

it('moving unrelated thought should not update cursor', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => newThought(state, { value: 'b1', insertNewSubthought: true }),
    state => newThought(state, { value: 'b1.1', insertNewSubthought: true }),
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    }),

  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }])

})

// ensure that siblings of descendants are properly merged into final result
it('move descendants with siblings', async () => {

  const text = `- a
  - b
   - c
   - d`

  const imported = await importText(RANKED_ROOT, text)(NOOP, initialState)
  const steps = [
    state => updateThoughts(state, imported),
    state => existingThoughtMove(state, {
      oldPath: [{ value: 'a', rank: 0 }, { value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: 1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b
    - c
    - d`)

})
