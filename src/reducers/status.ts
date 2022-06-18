import _ from 'lodash'
import State from '../@types/State'

/** Sets the connection status. */
const status = (state: State, { value }: { value: string }) => ({
  ...state,
  status: value,
})

export default _.curryRight(status)
