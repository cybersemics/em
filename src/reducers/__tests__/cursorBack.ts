import { initialState, reducerFlow } from '../../util'
import cursorBack from '../cursorBack'
// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'

it('move cursor to parent', () => {
  const steps = [newThought('a'), newSubthought('b'), cursorBack]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject([{ value: 'a', rank: 0 }])
})

it('remove cursor from root thought', () => {
  const steps = [newThought('a'), cursorBack]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toEqual(null)
})
