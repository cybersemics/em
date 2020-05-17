import {
  sync,
} from '../util'

const initialSyncQueue = {
  thoughtIndexUpdates: {},
  contextIndexUpdates: {},
}

/* Returns true if the state has updates in the syncQueue */
const hasUpdates = state => state && state.syncQueue && (
  Object.keys(state.syncQueue.thoughtIndexUpdates).length > 0 ||
  Object.keys(state.syncQueue.contextIndexUpdates).length > 0
)

const syncQueueEnhancer = createStore => (
  reducer,
  initialState,
  enhancer
) => {
  return createStore((state, action) => {
    const newState = reducer(state, action)

    // check if the new state has updates in the queue
    if (hasUpdates(newState)) {

      // sync updates to remote
      sync(newState.syncQueue.thoughtIndexUpdates, newState.syncQueue.contextIndexUpdates, { recentlyEdited: newState.recentlyEdited })

      // clear sync queue
      newState.syncQueue = initialSyncQueue

    }
    return newState
  }, initialState, enhancer)
}

export default syncQueueEnhancer
