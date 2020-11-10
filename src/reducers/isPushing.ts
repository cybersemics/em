import _ from 'lodash'
import { State } from '../util/initialState'

/** Set state.isPushing to track a sync in progress. Used to prevent the thoughtCache from loading before a sync completes. */
const isPushing = (state: State, { value }: { value: boolean }) => ({
  ...state,
  isPushing: value,
})

export default _.curryRight(isPushing)
