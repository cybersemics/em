import _ from 'lodash'
import { State } from '../util/initialState'

/** Sets the search limit. */
const searchLimits = (state: State, { value }: { value: string }) => ({
  ...state,
  searchLimit: value
})

export default _.curryRight(searchLimits)
