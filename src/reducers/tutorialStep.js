// reducers
import settings from './settings.js'

export default (state, { value }) =>
  settings(state, {
    key: 'Tutorial Step',
    value
  })
