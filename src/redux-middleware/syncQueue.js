import _ from 'lodash'
import { sync } from '../action-creators'
import { hasSyncs } from '../selectors'

/** Merges multiple sync batches into a single batch. Uses last value of local/remote. */
const mergeBatch = (accum, batch) =>
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
    updates: {
      ...accum.updates,
      ...batch.updates,
    },
    local: batch.local !== false,
    remote: batch.remote !== false,
  }
  : batch

/** Sync a batch to the local/remote. */
const syncBatch = batch =>
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

// debounce syncQueue updates to avoid syncing on every action
const debounceDelay = 100

/** Flushes the sync queue when updates are detected. */
const syncQueueMiddleware = ({ getState, dispatch }) => {

  /** Sync queued updates with the local and remote. Make sure to clear the queue immediately to prevent redundant syncs. */
  const flushQueue = async syncQueue => {

    if (syncQueue.length === 0) return Promise.resolve()

    // filter batches by data provider
    const localBatches = syncQueue.filter(batch => batch.local)
    const remoteBatches = syncQueue.filter(batch => batch.remote)

    // merge batches
    const localMergedBatch = localBatches.reduce(mergeBatch, {})
    const remoteMergedBatch = remoteBatches.reduce(mergeBatch, {})

    // sync
    await Promise.all([
      Object.keys(localMergedBatch).length > 0 && dispatch(syncBatch(localMergedBatch)),
      Object.keys(remoteMergedBatch).length > 0 && dispatch(syncBatch(remoteMergedBatch)),
    ])
  }

  const flushQueueDebounced = _.debounce(
    // clear queue immediately to prevent syncing more than once
    // then flush the queue
    () => {
      flushQueue(getState().syncQueue, dispatch)
        .then(() => {
          dispatch({ type: 'isSyncing', value: false })
        })
        .catch(e => {
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
