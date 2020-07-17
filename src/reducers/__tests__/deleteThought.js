import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import deleteThought from '../deleteThought'
import setCursor from '../setCursor'
import cursorBack from '../cursorBack'
import cursorUp from '../cursorUp'

it('delete thought within root', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
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
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
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
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
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
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a1.1', insertNewSubthought: true }),
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
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a2' }),
    newThought({ value: 'a3' }),
    deleteThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }])

})

it('cursor should move to next sibling if there is no prev sibling', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a2' }),
    newThought({ value: 'a3' }),
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
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    deleteThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('cursor should be removed if the last thought is deleted', () => {

  const steps = [
    newThought({ value: 'a' }),
    deleteThought({}),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})
