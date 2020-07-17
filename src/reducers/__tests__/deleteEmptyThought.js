import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import cursorBack from '../cursorBack'
import cursorUp from '../cursorUp'
import deleteEmptyThought from '../deleteEmptyThought'
import newThought from '../newThought'
import setCursor from '../setCursor'

it('delete empty thought', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: '' }),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('do not delete non-empty thought', () => {

  const steps = [
    newThought({ value: 'a' }),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('do not delete thought with children', () => {

  const steps = [
    newThought({ value: '' }),
    newThought({ value: '1', insertNewSubthought: true }),
    cursorBack,
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  -${' '}
    - 1`)

})

it('do nothing if there is no cursor', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    setCursor({ thoughtsRanked: null }),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

it('merge thoughts', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ab`)

})

it('insert second thought\'s children', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    newThought({ value: 'b1', insertNewSubthought: true }),
    newThought({ value: 'b2' }),
    cursorBack,
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ab
    - b1
    - b2`)

})

it('do not change first thought\'s children', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a2' }),
    cursorBack,
    newThought({ value: 'b' }),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ab
    - a1
    - a2`)

})

it('cursor should move to prev sibling', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: '' }),
    newThought({ value: 'a3' }),
    cursorUp,
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }])

})

it('cursor should move to next sibling if there is no prev sibling', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: '', insertNewSubthought: true }),
    newThought({ value: 'a2' }),
    newThought({ value: 'a3' }),
    cursorUp,
    cursorUp,
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }])

})

it('cursor should move to parent if the deleted thought has no siblings', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: '', insertNewSubthought: true }),
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('cursor should be removed if the last thought is deleted', () => {

  const steps = [
    newThought({ value: '' }),
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})
