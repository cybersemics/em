// reducers
import settings from './settings.js'

export default (state, { value }) =>
  settings(state, {
    key: 'Tutorial',
    value: value ? 'On' : 'Off'
  })
