import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import {
  clearPushQueue,
  editThought,
  deleteThought,
  isPushing,
  pull,
  pullLexemes,
  push,
  updateThoughts,
} from '../action-creators'
import { hashContext, keyValueBy, pathToContext, getDepth, headId } from '../util'
import { Thunk, Context, Index, Lexeme, PushBatch, State } from '../@types'

/** Merges multiple push batches into a single batch. Uses last value of local/remote. */
const mergeBatch = (accum: PushBatch, batch: PushBatch): PushBatch =>
  accum
    ? {
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
        pendingDeletes: [...(accum.pendingDeletes || []), ...(batch.pendingDeletes || [])],
        pendingEdits: [...(accum.pendingEdits || []), ...(batch.pendingEdits || [])],
        descendantMoves: [...(accum.descendantMoves || []), ...(batch.descendantMoves || [])],
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
      }
    : batch

/** Push a batch to the local/remote. */
const pushBatch = (batch: PushBatch) =>
  push(batch.thoughtIndexUpdates, batch.contextIndexUpdates, {
    recentlyEdited: batch.recentlyEdited,
    local: batch.local !== false,
    remote: batch.remote !== false,
    updates: batch.updates,
  })

/** Pull all descendants of pending deletes and dispatch deleteThought to fully delete. */
const flushDeletes =
  (pushQueue: PushBatch[]): Thunk<Promise<void>> =>
  async (dispatch, getState) => {
    // if there are pending thoughts that need to be deleted, dispatch an action to be picked up by the pullQueue middleware which can load pending thoughts before dispatching another deleteThought
    const pendingDeletes = pushQueue.map(batch => batch.pendingDeletes || []).flat()
    if (pendingDeletes?.length) {
      const pending: Index<Context> = keyValueBy(pendingDeletes, ({ context }) => {
        const id = hashContext(getState(), context)
        return id
          ? {
              [id]: context,
            }
          : null
      })

      await dispatch(pull(pending, { maxDepth: Infinity }))

      pendingDeletes.forEach(({ context, child }) => {
        dispatch(
          deleteThought({
            context,
            thoughtId: child,
          }),
        )
      })
    }
  }

/** Pull all descendants of pending edits and dispatch editThought to edit descendant contexts. */
const flushEdits =
  (pushQueue: PushBatch[]): Thunk<Promise<void>> =>
  async (dispatch, getState) => {
    // if there are pending thoughts that need to be deleted, dispatch an action to be picked up by the pullQueue middleware which can load pending thoughts before dispatching another deleteThought
    const pendingEdits = pushQueue.map(batch => batch.pendingEdits || []).flat()

    if (pendingEdits?.length) {
      const pending: Index<Context> = keyValueBy(pendingEdits, ({ context }) => {
        const id = hashContext(getState(), context)
        return id ? { [id]: context } : null
      })

      await dispatch(pull(pending, { maxDepth: Infinity }))

      pendingEdits.forEach(payload => {
        dispatch(editThought(payload))
      })
    }
  }

/** Pull all descendants of pending moves and dispatch moveThought to fully move. */
const flushMoves =
  (pushQueue: PushBatch[]): Thunk =>
  async (dispatch, getState) => {
    const state = getState()
    // if there are pending thoughts that need to be moved, dispatch an action to be picked up by the pullQueue middleware which can load pending thoughts before dispatching another moveThought
    const descendantMoves = pushQueue.map(batch => batch.descendantMoves || []).flat()
    const pendingPulls = pushQueue.map(batch => batch.pendingPulls || []).flat()

    let maxDepth = Infinity

    // pull all children of source context
    if (descendantMoves?.length) {
      const pending: Index<Context> = keyValueBy(descendantMoves, ({ pathOld }) => {
        // skip the pull for loaded descendants
        return { [headId(pathOld)]: pathToContext(state, pathOld) }
      })
      await dispatch(pull(pending, { maxDepth: Infinity }))
      maxDepth = Math.max(...descendantMoves.map(({ pathOld }) => getDepth(state, pathToContext(state, pathOld))))
    }

    // pull all children of destination (upto max depth of possibly conflcited path) context before moving any thoughts
    if (pendingPulls.length) {
      const pathToLoad = keyValueBy(pendingPulls, ({ path }) => {
        const context = pathToContext(state, path)
        return {
          [headId(path)]: context,
        }
      })

      await dispatch(pull(pathToLoad, { maxDepth }))
    }

    // @MIGRATION_TODO: Descendant moves is no longer required. Remove related logic.
    // descendantMoves.forEach(({ pathOld, pathNew }) => {
    //   dispatch(
    //     moveThought({
    //       oldPath: pathOld,
    //       newPath: pathNew,
    //     }),
    //   )
    // })
  }

/** Sync queued updates with the local and remote. Make sure to clear the queue immediately to prevent redundant syncs. */
const flushPushQueue = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  const { pushQueue } = getState()

  if (pushQueue.length === 0) return Promise.resolve()

  /**
   * Checks the latest state thoughtIndex (refers to new state after pullLexemes) and creates synced thoughtIndexUpdate for the pending lexemes..
   */
  const getSyncedThoughtsUpdate = (
    pendingLexemes: Index<boolean>,
    thoughtIndexUpdates: Index<Lexeme | null>,
  ): Index<Lexeme | null> =>
    Object.keys(pendingLexemes).reduce<Index<Lexeme | null>>((acc, thoughtId) => {
      const updatedState = getState()

      // Return early if this particular lexeme was not pending
      const hadPendingLexeme = pendingLexemes?.[thoughtId]
      if (!hadPendingLexeme) return acc

      // Note: thoughtIndexUpdates generated by undo/redo can have null valuesg
      const lexemeInBatch = thoughtIndexUpdates[thoughtId]

      const lexemeInUpdatedState = updatedState.thoughts.thoughtIndex[thoughtId]
      /**
       * Returns updated lexeme context without the already availble entries in the the lexemeInBatch contexts.
       */
      const updatedLexemeContexts = () =>
        lexemeInUpdatedState.contexts.filter(thoughtContext => {
          const isAlreadyInUpdate = lexemeInBatch?.contexts.some(
            thoughtContextInner => thoughtContextInner === thoughtContext,
          )
          return !isAlreadyInUpdate
        })

      return {
        ...acc,
        ...(lexemeInUpdatedState && lexemeInUpdatedState.contexts
          ? {
              [thoughtId]: lexemeInBatch
                ? {
                    ...lexemeInBatch,
                    contexts: [...lexemeInBatch.contexts, ...updatedLexemeContexts()],
                  }
                : null,
            }
          : {}),
      }
    }, {})

  dispatch(isPushing({ value: true }))

  const combinedBatch = pushQueue.reduce(mergeBatch, {} as PushBatch)

  const shouldSyncLexeme = combinedBatch.pendingLexemes && Object.keys(combinedBatch.pendingLexemes).length > 0

  // Pull all the pending lexemes that are not available in state yet, reconcile and update the thoughtIndexUpdates. Prevents local and remote lexemes getting overriden by incomplete application state (due to lazy loading).
  // Related issue: https://github.com/cybersemics/em/issues/1074
  if (shouldSyncLexeme) await dispatch(pullLexemes(Object.keys(combinedBatch.pendingLexemes!)))

  const syncedThoughtIndexUpdates = shouldSyncLexeme
    ? getSyncedThoughtsUpdate(combinedBatch.pendingLexemes!, combinedBatch.thoughtIndexUpdates)
    : {}

  // Update the application state as soon as possible.
  if (shouldSyncLexeme) {
    dispatch(
      updateThoughts({
        contextIndexUpdates: {},
        thoughtIndexUpdates: syncedThoughtIndexUpdates,
        remote: false,
        local: false,
      }),
    )
  }

  // Note: pushQueue needs to be passed to the flush action creators as lexemeSyncedPushQueue is asychronous and pushQueue is emptied as soon as dispatched.
  dispatch(flushDeletes(pushQueue))
  dispatch(flushEdits(pushQueue))
  dispatch(flushMoves(pushQueue))

  // filter batches by data provider
  const localBatches = pushQueue.filter(batch => batch.local)
  const remoteBatches = pushQueue.filter(batch => batch.remote)

  if (localBatches.length + remoteBatches.length < pushQueue.length) {
    throw new Error('Invalid pushQueue batch. local and remote cannot both be false.')
  }

  // merge batches
  const localMergedBatch = localBatches.reduce(mergeBatch, {} as PushBatch)
  const remoteMergedBatch = remoteBatches.reduce(mergeBatch, {} as PushBatch)

  /** Get updated thought index updates required for a batch from already synced thoughtIndexUpdates. */
  const getThoughtUpdates = (pendingLexemes: Index<boolean>) =>
    Object.keys(pendingLexemes).reduce((acc, thoughtId) => {
      const updatedLexme = syncedThoughtIndexUpdates[thoughtId]
      return {
        ...acc,
        ...(updatedLexme ? { [thoughtId]: updatedLexme } : {}),
      }
    }, {})

  const syncedLocalMergedBatch: PushBatch = {
    ...localMergedBatch,
    thoughtIndexUpdates: {
      ...localMergedBatch.thoughtIndexUpdates,
      ...(shouldSyncLexeme && localMergedBatch.pendingLexemes
        ? getThoughtUpdates(localMergedBatch.pendingLexemes!)
        : {}),
    },
  }

  const syncedRemoteMergedBatch: PushBatch = {
    ...remoteMergedBatch,
    thoughtIndexUpdates: {
      ...remoteMergedBatch.thoughtIndexUpdates,
      ...(shouldSyncLexeme && remoteMergedBatch.pendingLexemes
        ? getThoughtUpdates(remoteMergedBatch.pendingLexemes!)
        : {}),
    },
  }

  // push
  await Promise.all([
    Object.keys(localMergedBatch).length > 0 && dispatch(pushBatch(syncedLocalMergedBatch)),
    Object.keys(remoteMergedBatch).length > 0 && dispatch(pushBatch(syncedRemoteMergedBatch)),
  ])

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
