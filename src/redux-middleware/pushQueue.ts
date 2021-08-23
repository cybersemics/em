import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import {
  clearPushQueue,
  editThought,
  deleteThought,
  moveThought,
  isPushing,
  pull,
  push,
  updateThoughts,
} from '../action-creators'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import { equalArrays, hashContext, keyValueBy, pathToContext, getDepth } from '../util'
import { Thunk, Context, Index, Lexeme, PushBatch, State } from '../@types'

/** Merges multiple push batches into a single batch. Uses the last value of local/remote. You may also pass partial batches, such as an object that contains only thoughtIndexUpdates. */
const mergeBatch = (accum: PushBatch, batch: Partial<PushBatch>): PushBatch => ({
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
  // TODO: Should we set local/remote to true if any of the batches are true?
  // Or push them separately?
  local: batch.local !== false,
  remote: batch.remote !== false,
})

/** Merges conflicting Lexemes from two different ThoughtIndexUpdates. Only returns Lexemes with actual conflicts. Used to merge pulled Lexemes into a PushBatch. */
const mergeConflictingThoughtIndexUpdates = (
  thoughtIndexUpdatesA: Index<Lexeme | null>,
  thoughtIndexUpdatesB: Index<Lexeme | null>,
): Index<Lexeme> =>
  Object.keys(thoughtIndexUpdatesB).reduce<Index<Lexeme>>((acc, thoughtId) => {
    const lexemeA = thoughtIndexUpdatesA[thoughtId]
    const lexemeB = thoughtIndexUpdatesB[thoughtId]

    // return either lexeme is missing since we are only merging conflicting updates
    if (!lexemeA || !lexemeB) return acc

    /** Returns the lexeme's contexts in the pulled state without the lexemeA contexts. */
    const lexemeBcontextsDiff = lexemeB.contexts.filter(thoughtContextB => {
      const isInA = lexemeA.contexts.some(thoughtContextA =>
        equalArrays(thoughtContextA.context, thoughtContextB.context),
      )
      return !isInA
    })

    // if there are contexts in lexemeB that are not in A, then return without updates
    if (lexemeBcontextsDiff.length === 0) return acc

    return {
      ...acc,
      [thoughtId]: {
        ...lexemeA,
        contexts: [...lexemeA.contexts, ...lexemeBcontextsDiff],
      },
    }
  }, {})

/**
 * Fetches lexemes from local and remote and merges them into a PushBatch. When there is a synchronous edit in state, the Lexeme may already exist in the local or remote. This function ensures that the local/remote Lexeme gets merged with the edited Lexeme in Redux state. It updates Redux state only (like pull) and returns ThoughtIndexUpdates so that they can be merged into the existing batch and sent in one push.
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
      db.getThoughtsByIds(pendingLexemeIds),
      state.status === 'loaded'
        ? getFirebaseProvider(state, dispatch).getThoughtsByIds(pendingLexemeIds)
        : Promise.resolve({} as (Lexeme | undefined)[]),
    ])

    // generate a thoughtIndex from the pulled Lexemes
    const thoughtIndexPulled = pendingLexemeIds.reduce<Index<Lexeme>>((acc, thoughtHash, index) => {
      // assume local storage does not have Lexemes that remote doesn't have
      // keep remote if local is missing
      const lexemePulled = remoteLexemes[index] || localLexemes[index]
      return {
        ...acc,
        ...(lexemePulled ? { [thoughtHash]: lexemePulled } : {}),
      }
    }, {})

    const thoughtIndexUpdatesMerged = mergeConflictingThoughtIndexUpdates(thoughtIndexPulled, batch.thoughtIndexUpdates)

    // dispatch updateThoughts on Redux state only with the merged Lexemes to update the UI with new superscripts
    if (Object.keys(thoughtIndexUpdatesMerged).length > 0) {
      dispatch(
        updateThoughts({
          contextIndexUpdates: {},
          thoughtIndexUpdates: thoughtIndexUpdatesMerged,
          remote: false,
          local: false,
        }),
      )
    }

    return thoughtIndexUpdatesMerged
  }

/** Push a batch to the local and/or remote. */
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
      const pending: Index<Context> = keyValueBy(pendingDeletes, ({ context }) => ({
        [hashContext(context)]: context,
      }))

      await dispatch(pull(pending, { maxDepth: Infinity }))

      pendingDeletes.forEach(({ context, child }) => {
        dispatch(
          deleteThought({
            context,
            thoughtRanked: child,
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
        return { [hashContext(context)]: context }
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
        const context = pathToContext(pathOld)
        // skip the pull for loaded descendants
        return { [hashContext(context)]: context }
      })
      await dispatch(pull(pending, { maxDepth: Infinity }))
      maxDepth = Math.max(...descendantMoves.map(({ pathOld }) => getDepth(state, pathToContext(pathOld))))
    }

    // pull all children of destination (upto max depth of possibly conflcited path) context before moving any thoughts
    if (pendingPulls.length) {
      const pathToLoad = keyValueBy(pendingPulls, ({ path }) => {
        const context = pathToContext(path)
        return {
          [hashContext(context)]: context,
        }
      })

      await dispatch(pull(pathToLoad, { maxDepth }))
    }

    descendantMoves.forEach(({ pathOld, pathNew }) => {
      dispatch(
        moveThought({
          oldPath: pathOld,
          newPath: pathNew,
        }),
      )
    })
  }

/** Push queued updates to the local and remote. Make sure to clear the queue synchronously after calling this to prevent redundant pushes. */
const flushPushQueue = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  const { pushQueue } = getState()

  if (pushQueue.length === 0) return Promise.resolve()

  dispatch(isPushing({ value: true }))

  const combinedBatch = pushQueue.reduce(mergeBatch)

  // Pull all the pending lexemes that are not available in state yet, merge and update the thoughtIndexUpdates. Prevents local and remote lexemes getting overriden by incomplete application state (due to lazy loading). Dispatched updateThoughts
  // Related issue: https://github.com/cybersemics/em/issues/1074
  const thoughtIndexUpdatesMerged = await dispatch(pullPendingLexemes(combinedBatch))
  const mergedBatch = { thoughtIndexUpdates: thoughtIndexUpdatesMerged } as PushBatch

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
