import { initialState, reducerFlow } from '../../util'

// reducers
import newThought from '../newThought'
import cursorForward from '../cursorForward'
import setCursor from '../setCursor'

it('reverse cursorBack', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b', insertNewSubthought: true }),
    cursorForward,
    cursorForward,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('move to first child if there is no history', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b', insertNewSubthought: true }),
    newThought({ value: 'c' }),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    cursorForward,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('do nothing if there is no cursor and no cursor history', () => {

  const steps = [
    newThought({ value: 'a' }),
    setCursor({ thoughtsRanked: null }),
    cursorForward,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toBe(null)

})
