import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { hasPushes } from '../selectors'
import { hashContext, keyValueBy, pathToContext } from '../util'
import { PushBatch, State } from '../util/initialState'
import { Thunk, Context, Index } from '../types'

// import at end to avoid circular import
import { clearPushQueue, existingThoughtChange, existingThoughtDelete, existingThoughtMove, isPushing, pull, push } from '../action-creators'

/** Merges multiple push batches into a single batch. Uses last value of local/remote. */
const mergeBatch = (accum: PushBatch, batch: PushBatch): PushBatch =>
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
    pendingEdits: [
      ...accum.pendingEdits || [],
      ...batch.pendingEdits || [],
    ],
    pendingMoves: [
      ...accum.pendingMoves || [],
      ...batch.pendingMoves || [],
    ],
    updates: {
      ...accum.updates,
      ...batch.updates,
    },
    local: batch.local !== false,
    remote: batch.remote !== false,
  }
  : batch

/** Push a batch to the local/remote. */
const pushBatch = (batch: PushBatch) =>
  push(
    batch.thoughtIndexUpdates,
    batch.contextIndexUpdates,
    {
      recentlyEdited: batch.recentlyEdited,
      local: batch.local !== false,
      remote: batch.remote !== false,
      updates: batch.updates,
    }
  )

/** Pull all descendants of pending deletes and dispatch existingThoughtDelete to fully delete. */
const flushDeletes = (): Thunk<Promise<void>> => async (dispatch, getState) => {

  const { pushQueue } = getState()

  // if there are pending thoughts that need to be deleted, dispatch an action to be picked up by the pullQueue middleware which can load pending thoughts before dispatching another existingThoughtDelete
  const pendingDeletes = pushQueue.map(batch => batch.pendingDeletes || []).flat()
  if (pendingDeletes?.length) {

    const pending: Index<Context> = keyValueBy(pendingDeletes, ({ context }) => ({
      [hashContext(context)]: context
    }))

    await dispatch(pull(pending, { maxDepth: Infinity }))

    pendingDeletes.forEach(({ context, child }) => {
      dispatch(existingThoughtDelete({
        context,
        thoughtRanked: child,
      }))
    })
  }

}

/** Pull all descendants of pending edits and dispatch existingThoughtChange to edit descendant contexts. */
const flushEdits = (): Thunk<Promise<void>> => async (dispatch, getState) => {

  const { pushQueue } = getState()

  // if there are pending thoughts that need to be deleted, dispatch an action to be picked up by the pullQueue middleware which can load pending thoughts before dispatching another existingThoughtDelete
  const pendingEdits = pushQueue.map(batch => batch.pendingEdits || []).flat()

  if (pendingEdits?.length) {

    const pending: Index<Context> = keyValueBy(pendingEdits, ({ context }) => {
      return { [hashContext(context)]: context }
    })

    await dispatch(pull(pending, { maxDepth: Infinity }))

    pendingEdits.forEach(payload => {
      dispatch(existingThoughtChange(payload))
    })
  }

}

/** Pull all descendants of pending moves and dispatch existingThoughtMove to fully move. */
const flushMoves = (): Thunk => async (dispatch, getState) => {

  const { pushQueue } = getState()

  // if there are pending thoughts that need to be deleted, dispatch an action to be picked up by the pullQueue middleware which can load pending thoughts before dispatching another existingThoughtDelete
  const pendingMoves = pushQueue.map(batch => batch.pendingMoves || []).flat()
  if (pendingMoves?.length) {

    const pending: Index<Context> = keyValueBy(pendingMoves, ({ pathOld }) => {
      const context = pathToContext(pathOld)
      return {
        [hashContext(context)]: context
      }
    })

    await dispatch(pull(pending, { maxDepth: Infinity }))

    pendingMoves.forEach(({ pathOld, pathNew }) => {
      dispatch(existingThoughtMove({
        oldPath: pathOld,
        newPath: pathNew,
      }))
    })
  }

}

/** Sync queued updates with the local and remote. Make sure to clear the queue immediately to prevent redundant syncs. */
const flushPushQueue = (): Thunk<Promise<void>> => async (dispatch, getState) => {

  const { pushQueue } = getState()

  if (pushQueue.length === 0) return Promise.resolve()

  dispatch(flushDeletes())
  dispatch(flushEdits())
  dispatch(flushMoves())

  // filter batches by data provider
  const localBatches = pushQueue.filter(batch => batch.local)
  const remoteBatches = pushQueue.filter(batch => batch.remote)

  // merge batches
  const localMergedBatch = localBatches.reduce(mergeBatch, {} as PushBatch)
  const remoteMergedBatch = remoteBatches.reduce(mergeBatch, {} as PushBatch)

  // push
  await Promise.all([
    Object.keys(localMergedBatch).length > 0 && dispatch(pushBatch(localMergedBatch)),
    Object.keys(remoteMergedBatch).length > 0 && dispatch(pushBatch(remoteMergedBatch)),
  ])
}

// debounce pushQueue updates to avoid pushing on every action
const debounceDelay = 100

/** Flushes the push queue when updates are detected. */
const pushQueueMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {

  const flushQueueDebounced = _.debounce(
    // clear queue immediately to prevent pushing more than once
    // then flush the queue
    () => {
      dispatch(flushPushQueue())
        .then(() => {
          if (getState().isPushing) {
            dispatch(isPushing({ value: false }))
          }
        })
        .catch((e: Error) => {
          console.error('flushPushQueue error', e)
        })
      dispatch(clearPushQueue())
    },
    debounceDelay
  )

  return next => action => {
    next(action)

    // if state has queued updates, flush the queue
    // do not trigger on isPushing to prevent infinite loop
    const state = getState()
    if (hasPushes(state) && action.type !== 'isPushing') {
      if (!state.isPushing) {
        dispatch(isPushing({ value: true }))
      }
      flushQueueDebounced()
    }

  }
}

export default pushQueueMiddleware
