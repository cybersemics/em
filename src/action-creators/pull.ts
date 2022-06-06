import _ from 'lodash'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import { HOME_TOKEN } from '../constants'
import { mergeThoughts } from '../util'
import { updateThoughts } from '../action-creators'
import { getDescendantThoughtIds, getThoughtById, isPending } from '../selectors'
import { State, Thunk, ThoughtsInterface, ThoughtId, Thought } from '../@types'

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
  ): Thunk<Promise<Thought[]>> =>
  async (dispatch, getState) => {
    // pull only pending contexts parents unless forced
    const filteredThoughtIds = force ? thoughtIds : getPendingThoughtIds(getState(), thoughtIds)

    // short circuit if there are no contexts to fetch
    if (filteredThoughtIds.length === 0) return []

    // get local thoughts
    const thoughtLocalChunks: ThoughtsInterface[] = []

    const thoughtsLocalIterable = getManyDescendants(db, filteredThoughtIds, getState, {
      maxDepth: maxDepth ?? BUFFER_DEPTH,
    })

    const localThoughtsFetched = itForEach(thoughtsLocalIterable, (thoughtsChunk: ThoughtsInterface) => {
      // eslint-disable-next-line fp/no-mutating-methods
      thoughtLocalChunks.push(thoughtsChunk)

      // mergeUpdates will prevent overwriting non-pending thoughtsChunk with pending thoughtsChunk
      dispatch(
        updateThoughts({
          thoughtIndexUpdates: thoughtsChunk.thoughtIndex,
          lexemeIndexUpdates: thoughtsChunk.lexemeIndex,
          local: false,
          remote: false,
          // if the root is in the pathMap, force isLoading: false
          // otherwise isLoading will not be automatically unset by updateThoughts if the root context is empty
          ...(ROOT_ENCODED in filteredThoughtIds ? { isLoading: false } : null),
        }),
      )

      onLocalThoughts?.(thoughtsChunk)
    })

    // get remote thoughts
    const status = getState().status
    let remoteThoughtsFetched = Promise.resolve()
    if (status === 'loading' || status === 'loaded') {
      const thoughtsRemoteIterable = getManyDescendants(
        getFirebaseProvider(getState(), dispatch),
        thoughtIds,
        getState,
        {
          maxDepth: maxDepth ?? BUFFER_DEPTH,
        },
      )

      remoteThoughtsFetched = itForEach(thoughtsRemoteIterable, (thoughtsChunk: ThoughtsInterface) => {
        dispatch(
          updateThoughts({
            thoughtIndexUpdates: thoughtsChunk.thoughtIndex,
            lexemeIndexUpdates: thoughtsChunk.lexemeIndex,
            local: false,
            remote: false,
          }),
        )

        onRemoteThoughts?.(thoughtsChunk)
      })
    }

    // the state is updated directly with local and remote thoughts as they load, without conflict resolution
    // TODO: Use a syncable database that handles conflicts
    await Promise.all([localThoughtsFetched, remoteThoughtsFetched])

    // limit arity of mergeThoughts to 2 so that index does not get passed where a ThoughtsInterface is expected
    const thoughtsLocal = thoughtLocalChunks.reduce(_.ary(mergeThoughts, 2))

    // If the buffer size is reached on any loaded thoughts that are still within view, we will need to invoke flushPending recursively. Queueing updatePending will properly check visibleContexts and fetch any pending thoughts that are visible.
    const pendingThoughts = Object.values(thoughtsLocal.thoughtIndex || {}).filter(thought => thought.pending)

    // if we are pulling the home context and there are no pending thoughts, but the home parent is marked as pending, it means there are no children and we need to clear the pending status manually
    // https://github.com/cybersemics/em/issues/1344
    const stateNew = getState()

    const homeThought = getThoughtById(stateNew, HOME_TOKEN)
    if (
      thoughtIds.includes(ROOT_ENCODED) &&
      Object.keys(pendingThoughts).length === 0 &&
      isPending(stateNew, homeThought)
    ) {
      dispatch(
        updateThoughts({
          thoughtIndexUpdates: {
            ...stateNew.thoughts.thoughtIndex,
            [ROOT_ENCODED]: {
              ...stateNew.thoughts.thoughtIndex[ROOT_ENCODED],
              pending: false,
            },
          },
          lexemeIndexUpdates: {},
          local: false,
          remote: false,
        }),
      )
    }

    return pendingThoughts
  }

export default pull
