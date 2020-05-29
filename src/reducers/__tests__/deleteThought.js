import { store } from '../../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
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

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // delete thought
    deleteThought
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('delete thought with no cursor should do nothing ', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b' }),

    // clear cursor
    state => setCursor(state,  { thoughtsRanked: null }),

    // delete thought
    deleteThought
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

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // delete thought
    deleteThought
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('delete descendants', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new subthought
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new subthought
    state => newThought(state, { value: 'a1.1', insertNewSubthought: true }),

    cursorBack,

    // delete thought
    deleteThought
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})

it('cursor should move to prev sibling', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // new subthought 1
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new subthought 2
    state => newThought(state, { value: 'a2' }),

    // new subthought 3
    state => newThought(state, { value: 'a3' }),

    cursorUp,

    // delete thought
    deleteThought,
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
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // new subthought 2
    state => newThought(state, { value: 'a2' }),

    // new subthought 3
    state => newThought(state, { value: 'a3' }),

    cursorUp,
    cursorUp,

    // delete thought
    deleteThought,
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
    state => newThought(state, { value: 'a1', insertNewSubthought: true }),

    // delete thought
    deleteThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})


it('cursor should be removed if the last thought is deleted', () => {

  const steps = [

    // new thought in root
    state => newThought(state, { value: 'a' }),

    // delete thought
    deleteThought,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})

