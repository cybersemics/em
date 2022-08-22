import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import PushBatch from '../@types/PushBatch'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import clearPushQueue from '../action-creators/clearPushQueue'
import deleteThought from '../action-creators/deleteThought'
import isPushing from '../action-creators/isPushing'
import pull from '../action-creators/pull'
import pullPendingLexemes from '../action-creators/pullPendingLexemes'
import push from '../action-creators/push'
import getThoughtById from '../selectors/getThoughtById'
import parentOf from '../util/parentOf'

/** Merges multiple push batches into a single batch. Uses the last value of local/remote. You may also pass partial batches, such as an object that contains only lexemeIndexUpdates. */
const mergeBatch = (accum: PushBatch, batch: Partial<PushBatch>): PushBatch => ({
  ...accum,
  thoughtIndexUpdates: {
    ...accum.thoughtIndexUpdates,
    ...batch.thoughtIndexUpdates,
  },
  lexemeIndexUpdates: {
    ...accum.lexemeIndexUpdates,
    ...batch.lexemeIndexUpdates,
  },
  recentlyEdited: {
    ...accum.recentlyEdited,
    ...batch.recentlyEdited,
  },
  pendingDeletes: [...(accum.pendingDeletes || []), ...(batch.pendingDeletes || [])],
  pendingLexemes: {
    ...(accum.pendingLexemes || {}),
    ...(batch.pendingLexemes || {}),
  },
  updates: {
    ...accum.updates,
    ...batch.updates,
  },
  local: batch.local !== false,
  remote: batch.remote !== false,
})

/** Push a batch to the local and/or remote. */
const pushBatch = (batch: PushBatch) => {
  return push(batch.thoughtIndexUpdates, batch.lexemeIndexUpdates, {
    recentlyEdited: batch.recentlyEdited,
    local: batch.local,
    remote: batch.remote,
    updates: batch.updates,
  })
}

/** Pull all descendants of pending deletes and dispatch deleteThought to fully delete. */
const flushDeletes =
  (pushQueue: PushBatch[]): Thunk<Promise<void>> =>
  async (dispatch, getState) => {
    // if there are pending thoughts that need to be deleted, dispatch an action to be picked up by the pullQueue middleware which can load pending thoughts before dispatching another deleteThought
    const pendingDeletes = pushQueue.map(batch => batch.pendingDeletes || []).flat()
    if (pendingDeletes?.length) {
      const ids = _.uniq(pendingDeletes.map(({ siblingIds }) => siblingIds).flat())

      /*
        In a 2-part delete:
          Part I: All of in-memory descendants are deleted and pending descendants are pulled.
          Part II: Pending descendants, now that they are in memory, are deleted.

        deleteThought in Part I will not delete the pending thought since Part II needs a starting point

        Note: Since the default pull that is called by pullQueue only pulls pending thoughts, we need to force pull.
        The default pull would short circuit in Part II since there is no parent marked as pending (it was deleted in Part I).
        What if we have pull include missing Thoughts in addition to pending Thoughts? This will not work either. Some thoughts are missing when a thought is edited after it was added to the pullQueue but before the pullQueue was flushed. If pull includes missing thoughts, we get data integrity issues when outdated local thoughts get pulled.

        Therefore, force the pull here to fetch all descendants to delete in Part II.
      */
      await dispatch(pull(ids, { force: true, maxDepth: Infinity, preventLoadingAncestors: true }))

      pendingDeletes.forEach(({ path, siblingIds }) => {
        // instead of deleting just the pending thought, we have to delete any remaining siblingIds because they can be resurrected by pull
        dispatch((dispatch, getState) =>
          siblingIds
            // only delete siblings that still exist
            .filter(siblingId => getThoughtById(getState(), siblingId))
            // dispatch deleteThought for each existing sibling (including the pending thought)
            .map(siblingId =>
              dispatch(
                deleteThought({
                  pathParent: parentOf(path),
                  thoughtId: siblingId,
                  orphaned: true,
                }),
              ),
            ),
        )
      })
    }
  }

/** Push queued updates to the local and remote. Make sure to clear the queue synchronously after calling this to prevent redundant pushes. */
const flushPushQueue = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  const { pushQueue } = getState()

  if (pushQueue.length === 0) return Promise.resolve()

  dispatch(isPushing({ value: true }))

  const combinedBatch = pushQueue.reduce(mergeBatch)

  // Pull all the pending lexemes that are not available in state yet, merge and update the lexemeIndexUpdates. Prevents local and remote lexemes getting overriden by incomplete application state (due to lazy loading). Dispatched updateThoughts
  // Related issue: https://github.com/cybersemics/em/issues/1074
  const pulledLexemes = await dispatch(pullPendingLexemes(combinedBatch))
  const localMergedLexemeBatches =
    Object.keys(pulledLexemes).length > 0
      ? [
          {
            lexemeIndexUpdates: pulledLexemes,
            thoughtIndexUpdates: {},
            local: true,
            remote: false,
          },
        ]
      : []
  const remoteMergedLexemeBatches =
    Object.keys(pulledLexemes).length > 0
      ? [
          {
            lexemeIndexUpdates: pulledLexemes,
            thoughtIndexUpdates: {},
            local: false,
            remote: true,
          },
        ]
      : []

  // Note: pushQueue needs to be passed to the flush action creators as lexemeSyncedPushQueue is asychronous and pushQueue is emptied as soon as dispatched.
  await dispatch(flushDeletes(pushQueue))

  // group batches by data provider
  // make sure only local or remote are set to true, otherwise push will call both pushLocal and pushRemote
  // TODO: refactor to avoid awkward filtering and grouping
  const localBatches = pushQueue.filter(batch => batch.local).map(batch => ({ ...batch, remote: false }))
  const remoteBatches = pushQueue.filter(batch => batch.remote).map(batch => ({ ...batch, local: false }))

  if (localBatches.length + remoteBatches.length < pushQueue.length) {
    throw new Error('Invalid pushQueue batch. local and remote cannot both be false.')
  }

  // merge pulled Lexemes into both local and remote batches
  const localMergedBatch = [...localBatches, ...localMergedLexemeBatches].reduce(mergeBatch, {} as PushBatch)
  const remoteMergedBatch = [...remoteBatches, ...remoteMergedLexemeBatches].reduce(mergeBatch, {} as PushBatch)

  // push local and remote batches
  await Promise.all([
    // push will detect that these are only local updates
    (Object.keys(localMergedBatch.thoughtIndexUpdates || {}).length > 0 ||
      Object.keys(localMergedBatch.lexemeIndexUpdates || {}).length > 0) &&
      dispatch(pushBatch(localMergedBatch)),
    // push will detect that these are only remote updates
    (Object.keys(remoteMergedBatch.thoughtIndexUpdates || {}).length > 0 ||
      Object.keys(remoteMergedBatch.lexemeIndexUpdates || {}).length > 0) &&
      dispatch(pushBatch({ ...remoteMergedBatch })),
  ])

  // turn off isPushing at the end
  dispatch((dispatch, getState) => {
    if (getState().isPushing) {
      dispatch(isPushing({ value: false }))
    }
  })
}

// debounce pushQueue updates to avoid pushing on every action
const debounceDelay = 100

/** Flushes the push queue when updates are detected. */
const pushQueueMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  const flushQueueDebounced = _.debounce(
    // clear queue immediately to prevent pushing more than once
    // then flush the queue
    () => {
      dispatch(flushPushQueue()).catch((e: Error) => {
        console.error('flushPushQueue error', e)
      })
      dispatch(clearPushQueue())
    },
    debounceDelay,
  )

  return next => action => {
    next(action)

    // if state has queued updates, flush the queue
    // do not trigger on isPushing to prevent infinite loop
    const state = getState()

    if (state.pushQueue.length > 0 && action.type !== 'isPushing') {
      flushQueueDebounced()
    }
  }
}

export default pushQueueMiddleware
