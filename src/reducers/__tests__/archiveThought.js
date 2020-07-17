import { ROOT_TOKEN } from '../../constants'

// TODO: Why does util have to be imported before selectors and reducers?
import { initialState, reducerFlow } from '../../util'

import { exportContext, getContexts } from '../../selectors'
import { archiveThought, cursorUp, newThought, setCursor } from '../../reducers'

it('archive a thought', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    archiveThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - =archive
    - b
  - a`)

})

it('deduplicate archived thoughts with the same value', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => newThought(state, { value: 'b' }),
    archiveThought,
    archiveThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - =archive
    - b
  - a`)

})

it('do nothing if there is no cursor', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => setCursor(state, { thoughtsRanked: null }),
    archiveThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('move to top of archive', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => newThought(state, { value: 'c' }),
    archiveThought,
    archiveThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - =archive
    - b
    - c
  - a`)

})

it('permanently delete empty thought', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: '' }),
    archiveThought
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('permanently delete thought from archive', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    archiveThought,
    state => setCursor(state, {
      thoughtsRanked: [{ value: '=archive', rank: -1 }, { value: 'b', rank: 0 }]
    }),

    // delete the archived thought
    archiveThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - =archive
  - a`)

})

it('permanently delete archive', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    archiveThought,
    state => setCursor(state, { thoughtsRanked: [{ value: '=archive', rank: -1 }] }),
    archiveThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

  // ensure =archive is removed from thoughtIndex
  expect(getContexts(stateNew, '=archive'))
    .toHaveLength(0)

})

it('permanently delete archive with descendants', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b', insertNewSubthought: true }),
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    archiveThought,
    state => setCursor(state, { thoughtsRanked: [{ value: '=archive', rank: -1 }] }),
    archiveThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}`)

  // ensure =archive is removed from thoughtIndex
  expect(getContexts(stateNew, '=archive'))
    .toHaveLength(0)

  // ensure descendants are remvoed from thoughtIndex
  expect(getContexts(stateNew, 'a'))
    .toHaveLength(0)

})

it('cursor should move to prev sibling', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a2' }),
    state => newThought(state, { value: 'a3' }),
    cursorUp,
    archiveThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }])

})

it('cursor should move to next sibling if there is no prev sibling', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    state => newThought(state, { value: 'a2' }),
    state => newThought(state, { value: 'a3' }),
    cursorUp,
    cursorUp,
    archiveThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }])

})

it('cursor should move to parent if the deleted thought has no siblings', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),
    archiveThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('cursor should be removed if the last thought is deleted', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    archiveThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})

it('empty thought should be archived if it has descendants', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: '' }),
    state => newThought(state, { value: 'b', insertNewSubthought: true }),
    state => setCursor(state, {
      thoughtsRanked: [{ value: '', rank: 1 }]
    }),
    archiveThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - =archive
    -${' '}
      - b
  - a`)

})
