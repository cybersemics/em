// reducers
import settings from './settings'

/** Sets the Tutorial setting value. */
export default (state, { value }) =>
  settings(state, {
    key: 'Tutorial',
    value: value ? 'On' : 'Off'
  })
