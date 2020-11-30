import _ from 'lodash'
import { State } from '../util/initialState'

/** Sets the search limit. */
const searchLimits = (state: State, { value }: { value: number }) => ({
  ...state,
  searchLimit: value
})

export default _.curryRight(searchLimits)
