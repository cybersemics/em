import _ from 'lodash'
import State from '../@types/State'

/** Real-time meta validation error status. */
const invalidState = (state: State, { value }: { value: string }) => ({
  ...state,
  invalidState: value,
})

export default _.curryRight(invalidState)
