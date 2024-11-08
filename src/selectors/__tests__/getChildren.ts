import newThought from '../../actions/newThought'
import toggleHiddenThoughts from '../../actions/toggleHiddenThoughts'
import { HOME_TOKEN } from '../../constants'
import { getChildren } from '../../selectors/getChildren'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('get visible children', () => {
  it('when showHiddenThoughts is off', () => {
    const steps = [newThought('a'), newThought('=b')]

    const stateNew = reducerFlow(steps)(initialState())

    expect(getChildren(stateNew, HOME_TOKEN)).toMatchObject([{ value: 'a' }])
  })

  it('when showHiddenThoughts is off', () => {
    const steps = [newThought('a'), newThought('=b'), toggleHiddenThoughts]

    const stateNew = reducerFlow(steps)(initialState())

    expect(getChildren(stateNew, HOME_TOKEN)).toMatchObject([{ value: 'a' }, { value: '=b' }])
  })
})
