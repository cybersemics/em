import _ from 'lodash'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import { HOME_TOKEN } from '../constants'
import { hashContext, mergeThoughts } from '../util'
import { reconcile, updateThoughts } from '../action-creators'
import { isPending } from '../selectors'
import { Thunk, Context, Index, Lexeme, Parent, ThoughtsInterface } from '../@types'

const BUFFER_DEPTH = 2
const ROOT_ENCODED = hashContext([HOME_TOKEN])

export interface PullOptions {
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

/**
 * Fetch, reconciles, and updates descendants of any number of contexts up to a given depth.
 * WARNING: Unknown behavior if thoughtsPending takes longer than throttleFlushPending.
 */
const pull =
  (
    contextMap: Index<Context>,
    { maxDepth, onLocalThoughts, onRemoteThoughts }: PullOptions = {},
  ): Thunk<Promise<boolean>> =>
  async (dispatch, getState) => {
    if (Object.keys(contextMap).length === 0) return false

    // get local thoughts
    const thoughtLocalChunks: ThoughtsInterface[] = []

    const thoughtsLocalIterable = getManyDescendants(db, contextMap, { maxDepth: maxDepth || BUFFER_DEPTH })
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
          // if the root is in the contextMap, force isLoading: false
          // otherwise isLoading will not be automatically unset by updateThoughts if the root context is empty
          ...(ROOT_ENCODED in contextMap ? { isLoading: false } : null),
        }),
      )

      onLocalThoughts?.(thoughts)
    }

    const thoughtsLocal = thoughtLocalChunks.reduce(_.ary(mergeThoughts, 2))

    // get remote thoughts and reconcile with local
    const status = getState().status
    if (status === 'loaded') {
      const thoughtsRemoteIterable = getManyDescendants(getFirebaseProvider(getState(), dispatch), contextMap, {
        maxDepth: maxDepth || BUFFER_DEPTH,
      })

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

      const thoughtsRemote = thoughtRemoteChunks.reduce(_.ary(mergeThoughts, 2))

      // the reconcile dispatched above is based on remote keys only
      // thoughts that exist locally and not remotely will be missed
      // sync all thoughts here to ensure none are missed
      // TODO: Only reconcile local-only thoughts
      dispatch(
        reconcile({
          thoughtsResults: [thoughtsLocal, thoughtsRemote],
        }),
      )
    }

    // If the buffer size is reached on any loaded thoughts that are still within view, we will need to invoke flushPending recursively. Queueing updatePending will properly check visibleContexts and fetch any pending thoughts that are visible.
    const hasPending = Object.keys(thoughtsLocal.contextIndex || {}).some(
      key => (thoughtsLocal.contextIndex || {})[key].pending,
    )

    // if we are pulling the home context and there are no pending thoughts, but the home parent is marked a pending, it means there are no children and we need to clear the pending status manually
    // https://github.com/cybersemics/em/issues/1344
    const state = getState()
    if (ROOT_ENCODED in contextMap && !hasPending && isPending(state, [HOME_TOKEN])) {
      dispatch(
        updateThoughts({
          contextIndexUpdates: {
            ...state.thoughts.contextIndex,
            [ROOT_ENCODED]: {
              ...state.thoughts.contextIndex[ROOT_ENCODED],
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
