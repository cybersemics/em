import settings from './settings'
import { State } from '../util/initialState'

/** Sets the Tutorial setting value. */
const tutorial = (state: State, { value }: { value?: boolean }) =>
  settings(state, {
    key: 'Tutorial',
    value: value ? 'On' : 'Off'
  })

export default tutorial
