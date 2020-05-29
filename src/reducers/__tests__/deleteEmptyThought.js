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

    // new thought 1
    state => newThought(state, { value: 'a' }),

    // new thought 2
    state => newThought(state, { value: '' }),

    // delete thought
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

    // new thought 1
    state => newThought(state, { value: 'a' }),

    // delete thought
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

    // new thought
    state => newThought(state, { value: '' }),

    // new child
    state => newThought(state, { value: '1', insertNewSubthought: true }),

    cursorBack,

    // delete thought
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

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // clear cursor
    state => setCursor(state, { thoughtsRanked: null }),

    // delete thought
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

    // new thought 1
    state => newThought(state, { value: 'a' }),

    // new thought 2
    state => newThought(state, { value: 'b' }),

    // delete thought
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

    // new thought 1
    state => newThought(state, { value: 'a' }),

    // new thought 2
    state => newThought(state, { value: 'b' }),

    // new subthought 1
    state => newThought(state, { value: 'b1', insertNewSubthought: true }),

    // new subthought 2
    state => newThought(state, { value: 'b2' }),

    cursorBack,

    // delete thought
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

    // new thought 1
    state => newThought(state, { value: 'a' }),

    // new subthought 1
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new subthought 2
    state => newThought(state, { value: 'a2' }),

    cursorBack,

    // new thought 2
    state => newThought(state, { value: 'b' }),

    // delete thought
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

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought 1
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new subthought 2
    state => newThought(state, { value: '' }),

    // new subthought 3
    state => newThought(state, { value: 'a3' }),

    cursorUp,

    // delete thought
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }])

})

it('cursor should move to next sibling if there is no prev sibling', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought 1
    state => newThought(state, { value: '', insertNewSubthought: true }),

    // new subthought 2
    state => newThought(state, { value: 'a2' }),

    // new subthought 3
    state => newThought(state, { value: 'a3' }),

    cursorUp,
    cursorUp,

    // delete thought
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }])

})

it('cursor should move to parent if the deleted thought has no siblings', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought 1
    state => newThought(state, { value: '', insertNewSubthought: true }),

    // delete thought
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('cursor should be removed if the last thought is deleted', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: '' }),

    // delete thought
    deleteEmptyThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})
