import newThought from '../../actions/newThought'
import toggleHiddenThoughts from '../../actions/toggleHiddenThoughts'
import { HOME_TOKEN } from '../../constants'
import { getChildren } from '../../selectors/getChildren'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

describe('get visible children', () => {
  it('when showHiddenThoughts is off', () => {
    const steps = [newThought('a'), newThought('=b')]

    const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

    expect(getChildren(stateNew, HOME_TOKEN)).toMatchObject([{ value: 'a' }])
  })

  it('when showHiddenThoughts is off', () => {
    const steps = [newThought('a'), newThought('=b'), toggleHiddenThoughts]

    const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

    expect(getChildren(stateNew, HOME_TOKEN)).toMatchObject([{ value: 'a' }, { value: '=b' }])
  })
})
