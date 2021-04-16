import _ from 'lodash'
import { State } from '../util/initialState'

/** Set state.isPulling to track a sync in progress. */
const isPulling = (state: State, { value }: { value: boolean }) => ({
  ...state,
  isPulling: value,
})

export default _.curryRight(isPulling)
