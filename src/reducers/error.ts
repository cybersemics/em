import _ from 'lodash'
import { State } from '../util/initialState'

/** Sets an error. */
const error = (state: State, { value }: { value: string }) => ({
  ...state,
  error: value
})

export default _.curryRight(error)
