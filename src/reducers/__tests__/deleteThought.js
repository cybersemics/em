import { act } from 'react-dom/test-utils'
import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'
import { store } from '../../store'
import createTestApp from '../../test-helpers/createTestApp'
import * as db from '../../db'

// reducers
import cursorBack from '../cursorBack'
import cursorUp from '../cursorUp'
import deleteThought from '../deleteThought'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setCursor from '../setCursor'

it('delete thought within root', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    deleteThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('delete thought with no cursor should do nothing ', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ thoughtsRanked: null }),
    deleteThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

it('delete thought within context', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    deleteThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('delete descendants', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newSubthought('a1.1'),
    cursorBack,
    deleteThought({}),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('cursor should move to prev sibling', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    newThought('a3'),
    deleteThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }])

})

it('cursor should move to next sibling if there is no prev sibling', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    newThought('a3'),
    cursorUp,
    cursorUp,
    deleteThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }])

})

it('cursor should move to parent if the deleted thought has no siblings', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    deleteThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('cursor should be removed if the last thought is deleted', () => {

  const steps = [
    newThought('a'),
    deleteThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})

/** Mount tests required for caret */

describe('mount', () => {

  beforeEach(async () => {
    await createTestApp()
  })

  afterEach(async () => {
    store.dispatch({ type: 'clear' })
    await db.clearAll()
  })

  it('after deleting first child, caret should move to beginning of next sibling', async () => {
    store.dispatch({ type: 'newThought', value: 'apple' })
    store.dispatch({ type: 'newThought', value: 'banana' })
    store.dispatch({ type: 'cursorUp' })
    store.dispatch({ type: 'deleteThought' })
    act(jest.runOnlyPendingTimers)
    expect(window.getSelection()?.focusOffset).toBe(0)
  })

  it('after deleting last child, caret should move to end of previous sibling', async () => {
    store.dispatch({ type: 'newThought', value: 'apple' })
    store.dispatch({ type: 'newThought', value: 'banana' })
    store.dispatch({ type: 'deleteThought' })
    act(jest.runOnlyPendingTimers)
    expect(window.getSelection()?.focusOffset).toBe('apple'.length)
  })

})
