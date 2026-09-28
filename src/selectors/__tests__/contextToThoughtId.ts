import createThought from '../../actions/createThought'
import { HOME_PATH } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import createId from '../../util/createId'
import initialState from '../../util/initialState'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('contextToThoughtId', () => {
  const a = createId()
  const b = createId()
  const state = reducerFlow([
    createThought({ path: HOME_PATH, value: 'A', id: a, afterId: null }),
    createThought({ path: [a], value: 'B', id: b, afterId: null }),
  ])(initialState())

  expect(contextToThoughtId(state, ['A', 'B'])).toBe(b)
})
