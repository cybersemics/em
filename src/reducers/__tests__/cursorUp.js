import { store } from '../../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import cursorUp from '../cursorUp'
import setCursor from '../setCursor'

it('move cursor to previous sibling', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('move cursor from first child to parent', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b', insertNewSubthought: true }),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('move to last root child when there is no cursor', () => {

  const steps = [
    state => newThought(state, { value: 'a' }),
    state => newThought(state, { value: 'b' }),
    state => setCursor(state, { thoughtsRanked: null }),
    cursorUp,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'b', rank: 1 }])

})

it('do nothing when there are no thoughts', () => {

  const stateNew = cursorUp(initialState())

  expect(stateNew.cursor).toBe(null)

})
