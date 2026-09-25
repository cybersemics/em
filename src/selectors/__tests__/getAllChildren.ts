import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import expectThoughts from '../../test-helpers/expectThoughts'
import getAllChildrenAsThoughtsByContext from '../../test-helpers/getAllChildrenAsThoughtsByContext'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('get root children', () => {
  const steps = [newThought('a'), newThought('b')]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  expectThoughts(getAllChildrenAsThoughtsByContext(stateNew, [HOME_TOKEN]), ['a', 'b'])
})

it('get subthoughts', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c1'), newThought('c2')]

  const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

  expectThoughts(getAllChildrenAsThoughtsByContext(stateNew, ['a', 'b']), ['c1', 'c2'])
})
