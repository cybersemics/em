import _ from 'lodash'
import settings from './settings'
import State from '../@types/State'

/** Sets the Tutorial Choice Settings value. */
const tutorialChoice = (state: State, { value }: { value: string }) =>
  settings(state, {
    key: 'Tutorial Choice',
    value,
  })

export default _.curryRight(tutorialChoice)
