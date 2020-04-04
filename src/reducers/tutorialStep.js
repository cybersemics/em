// reducers
import settings from './settings'

export default (state, { value }) =>
  settings(state, {
    key: 'Tutorial Step',
    value
  })
