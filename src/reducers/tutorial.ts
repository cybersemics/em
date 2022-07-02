import _ from 'lodash'
import State from '../@types/State'
import settings from './settings'

/** Sets the Tutorial setting value. */
const tutorial = (state: State, { value }: { value?: boolean }) =>
  settings(state, {
    key: 'Tutorial',
    value: value ? 'On' : 'Off',
  })

export default _.curryRight(tutorial)
