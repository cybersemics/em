import { logWithTime, sync } from '../util'
import { ActionCreator } from '../types'
import { State } from '../util/initialState'

/** Returns true if the state has updates in the syncQueue. */
const hasQueue = (state: State) => state && state.syncQueue && (
  Object.keys(state.syncQueue.thoughtIndexUpdates ?? {}).length > 0 ||
  Object.keys(state.syncQueue.contextIndexUpdates ?? {}).length > 0
)

/** Syncs queued updates with the remote and clears the syncQueue. Works with action-creators/flushQueue and reducers/clearQueue. */
const flushQueue = (): ActionCreator => (dispatch, getState) => {
  const state = getState()

  if (!hasQueue(state)) return

  // clear queue immediately to prevent sync'ing more than once
  dispatch({ type: 'clearQueue' })

  logWithTime('clearQueue')

  sync(
    state.syncQueue!.thoughtIndexUpdates,
    state.syncQueue!.contextIndexUpdates,
    {
      recentlyEdited: state.syncQueue!.recentlyEdited,
      local: state.syncQueue!.local !== false,
      remote: state.syncQueue!.remote !== false,
      updates: state.syncQueue!.updates,
    }
  )

  logWithTime('flushQueue: sync')
}

export default flushQueue
