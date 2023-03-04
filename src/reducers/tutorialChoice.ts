import _ from 'lodash'
import State from '../@types/State'
import settings from './settings'

/** Sets the Tutorial Choice Settings value. */
const tutorialChoice = (state: State, { value }: { value: number }) =>
  settings(state, {
    key: 'Tutorial Choice',
    value: value.toString(),
  })

export default _.curryRight(tutorialChoice)
