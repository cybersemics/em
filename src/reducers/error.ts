import _ from 'lodash'
import { State } from '../types'

/** Sets an error. */
const error = (state: State, { value }: { value: string | null }) => ({
  ...state,
  error: value,
})

export default _.curryRight(error)
