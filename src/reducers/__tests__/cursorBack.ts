import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import cursorBack from '../cursorBack'
import newSubthought from '../newSubthought'
import newThought from '../newThought'

it('move cursor to parent', () => {
  const steps = [newThought('a'), newSubthought('b'), cursorBack]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor, ['a'])
})

it('remove cursor from root thought', () => {
  const steps = [newThought('a'), cursorBack]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toEqual(null)
})
