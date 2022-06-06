import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { clearPushQueue, deleteThought, isPushing, pull, push, updateThoughts } from '../action-creators'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import { keyValueBy, normalizeThought } from '../util'
import { getThoughtById } from '../selectors'
import { Thunk, Index, Lexeme, PushBatch, State, ThoughtId } from '../@types'

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
  // TODO: Should we set local/remote to true if any of the batches are true?
  // Or push them separately?
  local: batch.local !== false,
  remote: batch.remote !== false,
})

/** Merges conflicting Lexemes from two different LexemeIndexUpdates. Only returns Lexemes with actual conflicts. Used to merge pulled Lexemes into a PushBatch. */
const mergeConflictingLexemeIndexUpdates = (
  state: State,
  lexemeIndexUpdatesA: Index<Lexeme | null>,
  lexemeIndexUpdatesB: Index<Lexeme | null>,
): Index<Lexeme> =>
  Object.keys(lexemeIndexUpdatesB).reduce<Index<Lexeme>>((acc, key) => {
    const lexemeA = lexemeIndexUpdatesA[key]
    const lexemeB = lexemeIndexUpdatesB[key]

    // Bail if either lexeme is missing since we are only merging conflicting updates.
    if (!lexemeA || !lexemeB) return acc

    // If pulled Lexeme A contexts have been edited, the thought values may no longer be in conflict.
    // Inserting them would result in an invalid Lexeme context added to Lexeme B.
    // Filter out Lexeme A contexts whose values no longer match the Lexeme value.
    // Only merge thoughts that are still conflicting with Lexeme B contexts, or are completely new.
    // See: https://github.com/cybersemics/em/issues/1559
    const lexemeAContextsFiltered = lexemeA.contexts.filter(id => {
      const thought = getThoughtById(state, id)
      return !thought || normalizeThought(thought.value) === normalizeThought(lexemeA.value)
    })

    // get the Lexeme's contexts in the pulled state without the lexemeA contexts
    const lexemeBcontextsDiff = lexemeB.contexts.filter(
      thoughtIdB => !lexemeAContextsFiltered.some(thoughtIdA => thoughtIdA === thoughtIdB),
    )

    // if there are contexts in lexemeB that are not in A, then return without updates
    if (lexemeBcontextsDiff.length === 0) return acc

    return {
      ...acc,
      [key]: {
        ...lexemeA,
        contexts: [...lexemeAContextsFiltered, ...lexemeBcontextsDiff],
      },
    }
  }, {})

/**
 * Fetches lexemes from local and remote and merges them into a PushBatch. When there is a synchronous edit in state, the Lexeme may already exist in the local or remote. This function ensures that the local/remote Lexeme gets merged with the edited Lexeme in Redux state. It updates Redux state only (like pull) and returns LexemeIndexUpdates so that they can be merged into the existing batch and sent in one push.
 */
const pullPendingLexemes =
  (batch: PushBatch): Thunk<Promise<Index<Lexeme>>> =>
  async (dispatch, getState) => {
    // return if there are no pending lexemes
    const pendingLexemeIds = Object.keys(batch.pendingLexemes || {})
    if (pendingLexemeIds.length === 0) return Promise.resolve({})

    const state = getState()

    // pull local and remote Lexemes
    const [localLexemes, remoteLexemes] = await Promise.all([
      db.getLexemesByIds(pendingLexemeIds),
      state.status === 'loaded'
        ? getFirebaseProvider(state, dispatch).getLexemesByIds(pendingLexemeIds)
        : Promise.resolve({} as (Lexeme | undefined)[]),
    ])

    // generate a lexemeIndex from the pulled Lexemes
    const lexemeIndexPulled = pendingLexemeIds.reduce<Index<Lexeme>>((acc, thoughtHash, index) => {
      // assume local storage does not have Lexemes that remote doesn't have
      // keep remote if local is missing
      const lexemePulled = remoteLexemes[index] || localLexemes[index]
      return {
        ...acc,
        ...(lexemePulled ? { [thoughtHash]: lexemePulled } : {}),
      }
    }, {})

    const lexemeIndexUpdatesMerged = mergeConflictingLexemeIndexUpdates(
      state,
      lexemeIndexPulled,
      batch.lexemeIndexUpdates,
    )

    // dispatch updateThoughts on Redux state only with the merged Lexemes to update the UI with new superscripts
    if (Object.keys(lexemeIndexUpdatesMerged).length > 0) {
      dispatch(
        updateThoughts({
          thoughtIndexUpdates: {},
          lexemeIndexUpdates: lexemeIndexUpdatesMerged,
          remote: false,
          local: false,
        }),
      )
    }

    return lexemeIndexUpdatesMerged
  }

/** Push a batch to the local and/or remote. */
const pushBatch = (batch: PushBatch) =>
  push(batch.thoughtIndexUpdates, batch.lexemeIndexUpdates, {
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
      const pending: Record<ThoughtId, true> = keyValueBy(pendingDeletes, ({ context, thought }) => ({
        [thought.id]: true,
      }))

      const toBePulledThoughts = Object.keys(pending) as ThoughtId[]

      // In a 2-part delete, all of the descendants that are in the Redux store are deleted in Part I, and pending descendants are pulled and then deleted in Part II. (See flushDeletes)
      // With the old style pull, Part II pulled the pending descendants as expected. With the new style pull that only pulls pending thoughts, pull will short circuit in Part II since there is no Parent to be marked as pending (it was deleted in Part I).
      // We cannot simply include missing Thoughts in pull addition to pending Thoughts though. Some Thoughts are missing when a context is edited after it was added to the pullQueue but before the pullQueue was flushed. If pull includes missing Thoughts, we get data integrity issues when outdated local thoughts get pulled.
      // Therefore, force the pull here to fetch all descendants to delete in Part II.
      await dispatch(pull(toBePulledThoughts, { force: true, maxDepth: Infinity }))

      pendingDeletes.forEach(({ context, thought }) => {
        dispatch(
          deleteThought({
            context,
            thoughtId: thought.id,
            orphaned: true,
          }),
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
  const lexemeIndexUpdatesMerged = await dispatch(pullPendingLexemes(combinedBatch))

  const mergedBatch = { lexemeIndexUpdates: lexemeIndexUpdatesMerged } as PushBatch

  // Note: pushQueue needs to be passed to the flush action creators as lexemeSyncedPushQueue is asychronous and pushQueue is emptied as soon as dispatched.
  await dispatch(flushDeletes(pushQueue))

  // filter batches by data provider
  const localBatches = pushQueue.filter(batch => batch.local)
  const remoteBatches = pushQueue.filter(batch => batch.remote)

  if (localBatches.length + remoteBatches.length < pushQueue.length) {
    throw new Error('Invalid pushQueue batch. local and remote cannot both be false.')
  }

  // merge merged Lexemes into both local and remote batches
  const localMergedBatch = [...localBatches, mergedBatch].reduce(mergeBatch)
  const remoteMergedBatch = [...remoteBatches, mergedBatch].reduce(mergeBatch)

  // push local and remote batches
  await Promise.all([
    // push will detect that these are only local updates
    Object.keys(localMergedBatch).length > 0 && dispatch(pushBatch(localMergedBatch)),
    // push will detect that these are only remote updates
    Object.keys(remoteMergedBatch).length > 0 && dispatch(pushBatch(remoteMergedBatch)),
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
