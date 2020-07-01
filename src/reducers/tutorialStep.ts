import { settings } from '../reducers'
import { State } from '../util/initialState'

/** Sets the Tutorial Step settings value. */
const tutorialStep = (state: State, { value }: { value: number }) =>
  settings(state, {
    key: 'Tutorial Step',
    value: value.toString()
  })

export default tutorialStep
