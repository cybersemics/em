import _ from 'lodash'
import { State } from '../@types'
import settings from './settings'

/** Sets the Tutorial Choice Settings value. */
const tutorialChoice = (state: State, { value }: { value: string }) =>
  settings(state, {
    key: 'Tutorial Choice',
    value,
  })

export default _.curryRight(tutorialChoice)
