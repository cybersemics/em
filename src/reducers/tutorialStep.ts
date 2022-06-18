import _ from 'lodash'
import settings from '../reducers/settings'
import State from '../@types/State'

/** Sets the Tutorial Step settings value. */
const tutorialStep = (state: State, { value }: { value: number }) =>
  settings(state, {
    key: 'Tutorial Step',
    value: value.toString(),
  })

export default _.curryRight(tutorialStep)
