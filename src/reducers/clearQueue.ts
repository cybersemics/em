import { State } from '../util/initialState'

/** Clears the sync queue. This should only be done after the queued updates are persisted. See redux-middleware/syncQueue. */
const clearQueue = (state: State) => ({
  ...state,
  syncQueue: [],
})

export default clearQueue
