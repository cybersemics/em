import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { sync } from '../action-creators'
import { hasSyncs } from '../selectors'
import { SyncBatch, State } from '../util/initialState'
import { ActionCreator } from '../types'

/** Merges multiple sync batches into a single batch. Uses last value of local/remote. */
const mergeBatch = (accum: SyncBatch, batch: SyncBatch): SyncBatch =>
  accum ? {
    ...accum,
    contextIndexUpdates: {
      ...accum.contextIndexUpdates,
      ...batch.contextIndexUpdates,
    },
    thoughtIndexUpdates: {
      ...accum.thoughtIndexUpdates,
      ...batch.thoughtIndexUpdates,
    },
    recentlyEdited: {
      ...accum.recentlyEdited,
      ...batch.recentlyEdited,
    },
    pendingDeletes: [
      ...accum.pendingDeletes || [],
      ...batch.pendingDeletes || [],
    ],
    updates: {
      ...accum.updates,
      ...batch.updates,
    },
    local: batch.local !== false,
    remote: batch.remote !== false,
  }
  : batch

/** Sync a batch to the local/remote. */
const syncBatch = (batch: SyncBatch) =>
  sync(
    batch.thoughtIndexUpdates,
    batch.contextIndexUpdates,
    {
      recentlyEdited: batch.recentlyEdited,
      local: batch.local !== false,
      remote: batch.remote !== false,
      updates: batch.updates,
    }
  )

/** Sync queued updates with the local and remote. Make sure to clear the queue immediately to prevent redundant syncs. */
const flushQueue: ActionCreator = async (dispatch, getState) => {

  const { syncQueue } = getState()

  if (syncQueue.length === 0) return Promise.resolve()

  // filter batches by data provider
  const localBatches = syncQueue.filter(batch => batch.local)
  const remoteBatches = syncQueue.filter(batch => batch.remote)

  // merge batches
  const localMergedBatch = localBatches.reduce(mergeBatch, {} as SyncBatch)
  const remoteMergedBatch = remoteBatches.reduce(mergeBatch, {} as SyncBatch)

  // if there are pending thoughts that need to be deleted, dispatch an action to be picked up by the thought cache middleware which can load pending thoughts before dispatching another existingThoughtDelete
  if (localMergedBatch.pendingDeletes?.length) {
    dispatch({
      type: 'deleteDescendants',
      // these will get de-duped in thoughtCacheMiddleware
      pendingDeletes: syncQueue.map(batch => batch.pendingDeletes).flat(),
    })
  }

  // sync
  return Promise.all([
    Object.keys(localMergedBatch).length > 0 && dispatch(syncBatch(localMergedBatch)),
    Object.keys(remoteMergedBatch).length > 0 && dispatch(syncBatch(remoteMergedBatch)),
  ])
}

// debounce syncQueue updates to avoid syncing on every action
const debounceDelay = 100

/** Flushes the sync queue when updates are detected. */
const syncQueueMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {

  const flushQueueDebounced = _.debounce(
    // clear queue immediately to prevent syncing more than once
    // then flush the queue
    () => {
      flushQueue(dispatch, getState)
        .then(() => {
          dispatch({ type: 'isSyncing', value: false })
        })
        .catch((e: Error) => {
          console.error('flushQueue error', e)
        })
      dispatch({ type: 'clearQueue' })
    },
    debounceDelay
  )

  return next => action => {
    next(action)

    // if state has queued updates, flush the queue
    // do not trigger on isSyncing to prevent infinite loop
    if (hasSyncs(getState()) && action.type !== 'isSyncing') {
      dispatch({ type: 'isSyncing', value: true })
      flushQueueDebounced()
    }

  }
}

export default syncQueueMiddleware
