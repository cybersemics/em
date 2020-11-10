import { State } from '../util/initialState'

/** Clears the push queue. This should only be done after the queued updates are persisted. See redux-middleware/pushQueue. */
const clearPushQueue = (state: State) => ({
  ...state,
  pushQueue: [],
})

export default clearPushQueue
