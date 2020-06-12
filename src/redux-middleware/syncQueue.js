import _ from 'lodash'
import { sync } from '../util'

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

/** Sync queued updates with the local and remote. Make sure to clear the queue immediately to prevent redundant syncs. */
const flushQueue = async syncQueue => {

  if (syncQueue.length === 0) return

  // filter batches by data provider
  const localBatches = syncQueue.filter(batch => batch.local)
  const remoteBatches = syncQueue.filter(batch => batch.remote)

  // merge batches
  const localMergedBatch = localBatches.reduce(mergeBatch, {})
  const remoteMergedBatch = remoteBatches.reduce(mergeBatch, {})

  // sync
  await Promise.all([
    Object.keys(localMergedBatch).length > 0 && syncBatch(localMergedBatch),
    Object.keys(remoteMergedBatch).length > 0 && syncBatch(remoteMergedBatch),
  ])
}

// debounce syncQueue updates to avoid syncing on every action
const debounceDelay = 100

/** Flushes the sync queue when updates are detected. */
const syncQueueMiddleware = ({ getState, dispatch }) => {

  const flushQueueDebounced = _.debounce(
    // clear queue immediately to prevent syncing more than once
    // then flush the queue
    () => {
      flushQueue(getState().syncQueue)
      dispatch({ type: 'clearQueue' })
    },
    debounceDelay
  )

  return next => action => {
    next(action)

    // if state has queued updates, flush the queue
    if (getState().syncQueue.length > 0) {
      flushQueueDebounced()
    }

  }
}

export default syncQueueMiddleware
