import { initialState, reducerFlow } from '../../util'

// reducers
import newThought from '../newThought'
import cursorBack from '../cursorBack'

it('move cursor to parent', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'b', insertNewSubthought: true }),
    cursorBack,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toEqual([{ value: 'a', rank: 0 }])

})

it('remove cursor from root thought', () => {

  const steps = [
    newThought('a'),
    cursorBack,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toEqual(null)

})
