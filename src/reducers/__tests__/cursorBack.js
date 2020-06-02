import { initialState, reducerFlow } from '../../util'

// reducers
import newThought from '../newThought'
import cursorBack from '../cursorBack'

it('move cursor to parent', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // new thought 2 in root
    state => newThought(state, { value: 'b', insertNewSubthought: true }),

    // cursorBack
    cursorBack,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }])

})

it('remove cursor from root thought', () => {

  const steps = [

    // new thought 1 in root
    state => newThought(state, { value: 'a' }),

    // cursorBack
    cursorBack,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toEqual(null)

})
