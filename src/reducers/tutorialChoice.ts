import settings from './settings'
import { State } from '../util/initialState'

/** Sets the Tutorial Choice Settings value. */
const tutorialChoice = (state: State, { value }: { value: string }) =>
  settings(state, {
    key: 'Tutorial Choice',
    value
  })

export default tutorialChoice
