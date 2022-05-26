import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { getChildren } from '../../selectors'
import { newThought, toggleHiddenThoughts } from '../../reducers'

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
