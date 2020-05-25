import flushQueue from '../action-creators/flushQueue'

/** Returns true if the state has updates in the syncQueue. */
const hasUpdates = state => state && state.syncQueue && (
  Object.keys(state.syncQueue.thoughtIndexUpdates).length > 0 ||
  Object.keys(state.syncQueue.contextIndexUpdates).length > 0
)

/** Flushes the sync queue when updates are detected. */
const syncQueueMiddleware = ({ getState, dispatch }) => {
  return next => action => {
    next(action)

    // check if new state has updates
    const state = getState()
    // ignore clearQueue to prevent infinite loop
    if (action.type !== 'clearQueue' && hasUpdates(state)) {
      dispatch(flushQueue())
    }

  }
}

export default syncQueueMiddleware
