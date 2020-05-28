import { store } from '../../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import cursorForward from '../cursorForward'
import setCursor from '../setCursor'

it('reverse cursorBack', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new child
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // cursorBack
    cursorForward,

    // cursorForward
    cursorForward,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('move to first child if there is no history', () => {

  const steps = [

    // root thought
    state => newThought(state, { value: 'a' }),

    // child 1
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // child 2
    state => newThought(state, { value: 'c' }),

    // manually set cursor on parent so there is no cursor history
    state => setCursor(state, { thoughtsRanked: [{ value: 'a', rank: 0 }] }),

    // cursorForward
    cursorForward,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('do nothing if there is no cursor and no cursor history', () => {

  const steps = [

    // root thought
    state => newThought(state, { value: 'a' }),

    // clear cursor
    state => setCursor(state, { thoughtsRanked: null }),

    // cursorForward
    cursorForward,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})
