import _ from 'lodash'
import { State } from '../util/initialState'

/** Set state.isSyncing to track a sync in progress. Used to prevent the thoughtCache from loading before a sync completes. */
const isSyncing = (state: State, { value }: { value: boolean }) => ({
  ...state,
  isSyncing: value,
})

export default _.curryRight(isSyncing)
