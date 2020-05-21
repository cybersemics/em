// reducers
import settings from './settings'

/** Sets the Tutorial Choice Settings value. */
export default (state, { value }) =>
  settings(state, {
    key: 'Tutorial Choice',
    value
  })
