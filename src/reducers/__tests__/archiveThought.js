import { ROOT_TOKEN } from '../../constants'

// TODO: Why does util have to be imported before selectors and reducers?
import { initialState, reducerFlow } from '../../util'

import { exportContext, getContexts } from '../../selectors'
import { archiveThought, cursorUp, newThought, setCursor } from '../../reducers'

it('archive a thought', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    archiveThought({}),
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
    newThought('a'),
    newThought('b'),
    newThought('b'),
    archiveThought({}),
    archiveThought({}),
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
    newThought('a'),
    setCursor({ thoughtsRanked: null }),
    archiveThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('move to top of archive', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    newThought('c'),
    archiveThought({}),
    archiveThought({}),
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
    newThought('a'),
    newThought(''),
    archiveThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('permanently delete thought from archive', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    archiveThought({}),
    setCursor({
      thoughtsRanked: [{ value: '=archive', rank: -1 }, { value: 'b', rank: 0 }]
    }),

    // delete the archived thought
    archiveThought({}),
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
    newThought('a'),
    newThought('b'),
    archiveThought({}),
    setCursor({ thoughtsRanked: [{ value: '=archive', rank: -1 }] }),
    archiveThought({}),
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
    newThought('a'),
    newThought({ value: 'b', insertNewSubthought: true }),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    archiveThought({}),
    setCursor({ thoughtsRanked: [{ value: '=archive', rank: -1 }] }),
    archiveThought({}),
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
    newThought('a'),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought('a2'),
    newThought('a3'),
    cursorUp,
    archiveThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }])

})

it('cursor should move to next sibling if there is no prev sibling', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought('a2'),
    newThought('a3'),
    cursorUp,
    cursorUp,
    archiveThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }])

})

it('cursor should move to parent if the deleted thought has no siblings', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'a1', insertNewSubthought: true }),
    archiveThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('cursor should be removed if the last thought is deleted', () => {

  const steps = [
    newThought('a'),
    archiveThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})

it('empty thought should be archived if it has descendants', () => {

  const steps = [
    newThought('a'),
    newThought(''),
    newThought({ value: 'b', insertNewSubthought: true }),
    setCursor({
      thoughtsRanked: [{ value: '', rank: 1 }]
    }),
    archiveThought({}),
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
