// reducers
import settings from './settings'

/** Sets the Tutorial Step settings value. */
export default (state, { value }) =>
  settings(state, {
    key: 'Tutorial Step',
    value
  })
