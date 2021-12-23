import _ from 'lodash'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import { HOME_TOKEN } from '../constants'
import { mergeThoughts } from '../util'
import { reconcile, updateThoughts } from '../action-creators'
import { getDescendantThoughtIds, getThoughtById, isPending } from '../selectors'
import { Thunk, Index, Lexeme, Parent, State, ThoughtsInterface, ThoughtId } from '../@types'

const BUFFER_DEPTH = 2
const ROOT_ENCODED = HOME_TOKEN

export interface PullOptions {
  // pull given contexts without checking if they are pending
  // used when authenticated to force a pull from the remote
  force?: boolean
  maxDepth?: number
  onLocalThoughts?: (thoughts: ThoughtsInterface) => void
  onRemoteThoughts?: (thoughts: ThoughtsInterface) => void
}

/** Iterate through an async iterable and invoke a callback on each yield. */
async function itForEach<T>(it: AsyncIterable<T>, callback: (value: T) => void) {
  // eslint-disable-next-line fp/no-loops
  for await (const item of it) {
    callback(item)
  }
}

/** Returns a list of pending contexts from all pathMap contexts and their descendants. */
const getPendingThoughtIds = (state: State, thoughtIds: ThoughtId[]): ThoughtId[] => {
  return _.flatMap(thoughtIds, thoughtId => {
    const thought = getThoughtById(state, thoughtId)

    const isThoughtPending = !thought || thought.pending

    return isThoughtPending
      ? // if the original pathMap context is pending, use it
        [thoughtId]
      : // otherwise search for pending or missing descendants
        // @MIGRATION_TODO: Fix explicit type conversion here
        getDescendantThoughtIds(state, thoughtId).filter(thoughtId => {
          const thought = getThoughtById(state, thoughtId)
          return !thought || thought.pending
        })
  })
}

/**
 * Fetch, reconciles, and updates descendants of any number of contexts up to a given depth.
 * WARNING: Unknown behavior if thoughtsPending takes longer than throttleFlushPending.
 */
const pull =
  (
    thoughtIds: ThoughtId[],
    { force, maxDepth, onLocalThoughts, onRemoteThoughts }: PullOptions = {},
  ): Thunk<Promise<boolean>> =>
  async (dispatch, getState) => {
    // pull only pending contexts parents unless forced
    const filteredThoughtIds = force ? thoughtIds : getPendingThoughtIds(getState(), thoughtIds)

    // short circuit if there are no contexts to fetch
    if (filteredThoughtIds.length === 0) return false

    // get local thoughts
    const thoughtLocalChunks: ThoughtsInterface[] = []

    const thoughtsLocalIterable = getManyDescendants(db, filteredThoughtIds, getState(), {
      maxDepth: maxDepth !== undefined ? maxDepth : BUFFER_DEPTH,
    })

    // const thoughtsLocalIterable = getManyDescendants(db, pathMapFiltered, { maxDepth: maxDepth || BUFFER_DEPTH })
    // eslint-disable-next-line fp/no-loops
    for await (const thoughts of thoughtsLocalIterable) {
      // eslint-disable-next-line fp/no-mutating-methods
      thoughtLocalChunks.push(thoughts)

      // TODO: Update only thoughts for which shouldUpdate is false in reconcile and remove redundant updateThoughts. Entries for which shouldUpdate is true are updated anyway.
      // mergeUpdates will prevent overwriting non-pending thoughts with pending thoughts
      dispatch(
        updateThoughts({
          contextIndexUpdates: thoughts.contextIndex,
          thoughtIndexUpdates: thoughts.thoughtIndex,
          local: false,
          remote: false,
          // if the root is in the pathMap, force isLoading: false
          // otherwise isLoading will not be automatically unset by updateThoughts if the root context is empty
          ...(ROOT_ENCODED in filteredThoughtIds ? { isLoading: false } : null),
        }),
      )

      onLocalThoughts?.(thoughts)
    }

    // limit arity of mergeThoughts to 2 so that index does not get passed where a ThoughtsInterface is expected
    const thoughtsLocal = thoughtLocalChunks.reduce(_.ary(mergeThoughts, 2))

    // get remote thoughts and reconcile with local
    const status = getState().status
    if (status === 'loading' || status === 'loaded') {
      const thoughtsRemoteIterable = getManyDescendants(
        getFirebaseProvider(getState(), dispatch),
        thoughtIds,
        getState(),
        {
          maxDepth: maxDepth || BUFFER_DEPTH,
        },
      )

      const thoughtRemoteChunks: ThoughtsInterface[] = []

      // TODO: Refactor into zipThoughts
      await itForEach(thoughtsRemoteIterable, (thoughtsRemoteChunk: ThoughtsInterface) => {
        // eslint-disable-next-line fp/no-mutating-methods
        thoughtRemoteChunks.push(thoughtsRemoteChunk)

        // find the corresponding Parents from the local store (if any exist) so it can be reconciled with the remote Parents
        const thoughtsLocalContextIndexChunk = _.transform(
          thoughtsRemoteChunk.contextIndex,
          (accum, parentEntryRemote, key) => {
            const parentEntryLocal = thoughtsLocal.contextIndex[key]
            if (parentEntryLocal) {
              accum[key] = parentEntryLocal
            }
          },
          {} as Index<Parent>,
        )

        // find the corresponding Lexemes from the local store (if any exist) so it can be reconciled with the remote Lexemes
        const thoughtsLocalThoughtIndexChunk = _.transform(
          thoughtsRemoteChunk.thoughtIndex,
          (accum, lexemeRemote, key) => {
            const lexemeLocal = thoughtsLocal.thoughtIndex[key]
            if (lexemeLocal) {
              accum[key] = lexemeLocal
            }
          },
          {} as Index<Lexeme>,
        )
        dispatch(
          reconcile({
            thoughtsResults: [
              {
                contextIndex: thoughtsLocalContextIndexChunk,
                thoughtIndex: thoughtsLocalThoughtIndexChunk,
              },
              thoughtsRemoteChunk,
            ],
          }),
        )

        onRemoteThoughts?.(thoughtsRemoteChunk)
      })

      // limit arity of mergeThoughts to 2 so that index does not get passed where a ThoughtsInterface is expected
      const thoughtsRemote = thoughtRemoteChunks.reduce(_.ary(mergeThoughts, 2))

      // The reconcile dispatched above only covers remote keys since it is within thoughtsRemoteIterable.
      // Reconcile thoughts that exist locally but not remotely.
      dispatch(
        reconcile({
          thoughtsResults: [thoughtsLocal, thoughtsRemote],
          local: false,
        }),
      )
    }

    // If the buffer size is reached on any loaded thoughts that are still within view, we will need to invoke flushPending recursively. Queueing updatePending will properly check visibleContexts and fetch any pending thoughts that are visible.
    const hasPending = Object.keys(thoughtsLocal.contextIndex || {}).some(
      key => (thoughtsLocal.contextIndex || {})[key].pending,
    )

    // if we are pulling the home context and there are no pending thoughts, but the home parent is marked a pending, it means there are no children and we need to clear the pending status manually
    // https://github.com/cybersemics/em/issues/1344
    const stateNew = getState()

    if (thoughtIds.includes(ROOT_ENCODED) && !hasPending && isPending(stateNew, [HOME_TOKEN])) {
      dispatch(
        updateThoughts({
          contextIndexUpdates: {
            ...stateNew.thoughts.contextIndex,
            [ROOT_ENCODED]: {
              ...stateNew.thoughts.contextIndex[ROOT_ENCODED],
              pending: false,
            },
          },
          thoughtIndexUpdates: {},
          local: false,
          remote: false,
        }),
      )
    }

    return hasPending
  }

export default pull
