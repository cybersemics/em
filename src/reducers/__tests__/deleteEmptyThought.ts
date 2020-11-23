import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import setCursorFirstMatchActionCreator from '../../test-helpers/setCursorFirstMatch'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'

// reducers
import cursorBack from '../cursorBack'
import cursorUp from '../cursorUp'
import deleteEmptyThought from '../deleteEmptyThought'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setCursor from '../setCursor'

it('delete empty thought', () => {

  const steps = [
    newThought('a'),
    newThought(''),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('do not delete non-empty thought', () => {

  const steps = [
    newThought('a'),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('do not delete thought with children', () => {

  const steps = [
    newThought(''),
    newSubthought('1'),
    cursorBack,
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ${''/* prevent trim_trailing_whitespace */}
    - 1`)

})

it('do nothing if there is no cursor', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ path: null }),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b`)

})

it('merge thoughts', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ab`)

})

it('insert second thought\'s children', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    newSubthought('b1'),
    newThought('b2'),
    cursorBack,
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ab
    - b1
    - b2`)

})

it('do not change first thought\'s children', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    cursorBack,
    newThought('b'),
    deleteEmptyThought,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - ab
    - a1
    - a2`)

})

it('cursor should move to prev sibling', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought(''),
    newThought('a3'),
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
    newThought('a'),
    newSubthought(''),
    newThought('a2'),
    newThought('a3'),
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
    newThought('a'),
    newSubthought(''),
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('cursor should be removed if the last thought is deleted', () => {

  const steps = [
    newThought(''),
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})

/** Mount tests required for caret. */
describe('mount', () => {

  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('after deleteEmptyThought, caret should move to end of previous thought', () => {
    store.dispatch([
      { type: 'newThought', value: 'apple' },
      { type: 'newThought' },
      { type: 'deleteEmptyThought' }
    ])
    jest.runOnlyPendingTimers()
    expect(window.getSelection()?.focusOffset).toBe('apple'.length)
  })

  it('after merging siblings, caret should be in between', () => {
    store.dispatch([
      {
        type: 'importText',
        path: RANKED_ROOT,
        text: `
        - apple
          - banana`
      },
      setCursorFirstMatchActionCreator(['apple', 'banana']),
      { type: 'deleteEmptyThought' },
    ])
    jest.runOnlyPendingTimers()
    expect(window.getSelection()?.focusOffset).toBe('apple'.length)
  })

})
