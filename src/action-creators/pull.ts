import _ from 'lodash'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Thunk from '../@types/Thunk'
import updateThoughts from '../action-creators/updateThoughts'
import { HOME_TOKEN } from '../constants'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import getThoughtById from '../selectors/getThoughtById'
import isPending from '../selectors/isPending'
import mergeThoughts from '../util/mergeThoughts'

const BUFFER_DEPTH = 2

export interface PullOptions {
  // force a pull from the remote
  force?: boolean
  // remote only
  remote?: boolean
  maxDepth?: number
  onLocalThoughts?: (thoughts: ThoughtIndices) => void
  onRemoteThoughts?: (thoughts: ThoughtIndices) => void
  preventLoadingAncestors?: boolean
}

/** Iterate through an async iterable and invoke a callback on each yield. */
async function itForEach<T>(it: AsyncIterable<T>, callback: (value: T) => void) {
  // eslint-disable-next-line fp/no-loops
  for await (const item of it) {
    callback(item)
  }
}

/** Filters a list of ids to only pending thoughts. */
const filterPending = (state: State, thoughtIds: ThoughtId[]): ThoughtId[] =>
  thoughtIds.filter(thoughtId => {
    const thought = getThoughtById(state, thoughtId)
    return !thought || thought.pending
  })

/** Returns a list of all pending descendants of the given thoughts (inclusive). */
const filterPendingDescendants = (state: State, thoughtIds: ThoughtId[]): ThoughtId[] =>
  _.flatMap(thoughtIds, thoughtId => {
    const thought = getThoughtById(state, thoughtId)

    const isThoughtPending = !thought || thought.pending

    return isThoughtPending
      ? // return pending input thoughts as-is
        // there are no non-pending descendants to traverse
        [thoughtId]
      : // otherwise traverse descendants for pending thoughts
        getDescendantThoughtIds(state, thoughtId).filter(descendantThoughtId => {
          const descendantThought = getThoughtById(state, descendantThoughtId)
          return !descendantThought || descendantThought.pending
        })
  })

/**
 * Fetch, reconciles, and updates descendants of any number of contexts up to a given depth.
 * WARNING: Unknown behavior if thoughtsPending takes longer than throttleFlushPending.
 */
const pull =
  (
    thoughtIds: ThoughtId[],
    { force, maxDepth, onLocalThoughts, onRemoteThoughts, preventLoadingAncestors, remote }: PullOptions = {},
  ): Thunk<Promise<Thought[]>> =>
  async (dispatch, getState) => {
    // pull only pending thoughts unless forced
    const filteredThoughtIds = force
      ? thoughtIds
      : // if maxDepth is provided, find pending descendants (e.g. for exporting thoughts and their descendants)
        // otherwise, just pull the specific thoughts given if they are pending
        (Number(maxDepth) > 0 ? filterPendingDescendants : filterPending)(getState(), thoughtIds)

    // short circuit if there are no contexts to fetch
    if (filteredThoughtIds.length === 0) return []

    const thoughtLocalChunks: ThoughtIndices[] = []
    const thoughtRemoteChunks: ThoughtIndices[] = []

    // when forcing a pull for the remote on authenticate, do not re-pull local thoughts
    const thoughtsLocalIterable = getManyDescendants(db, remote ? [] : filteredThoughtIds, getState, {
      maxDepth: maxDepth ?? BUFFER_DEPTH,
      preventLoadingAncestors,
    })

    // pull local before remote
    // parallelizing may result in conficts since there is no conflict resolution mechanism currently
    await itForEach(thoughtsLocalIterable, (thoughtsChunk: ThoughtIndices) => {
      // eslint-disable-next-line fp/no-mutating-methods
      thoughtLocalChunks.push(thoughtsChunk)

      // mergeUpdates will prevent overwriting non-pending thoughtsChunk with pending thoughtsChunk
      const { autologin, isLoading, status } = getState()
      dispatch(
        updateThoughts({
          thoughtIndexUpdates: thoughtsChunk.thoughtIndex,
          lexemeIndexUpdates: thoughtsChunk.lexemeIndex,
          local: false,
          remote: false,
          // If the app is loading and the root is successfully pulled, set isLoading: false.
          // Otherwise isLoading will not be automatically unset by updateThoughts if the root thought has no children.
          // However, if Firebase is disconnected and the root thought does not exist in IndexedDB, we need to wait for Firebase to load.
          // If the root does not exist in IndexedDB or Firebase (i.e. neither of these blocks get called to set isLoading: false), the final updateThoughts at the end of pull will set isLoading: false.
          ...(isLoading &&
          !(autologin && (status === 'disconnected' || status === 'connecting')) &&
          filteredThoughtIds.includes(HOME_TOKEN)
            ? { isLoading: false }
            : null),
        }),
      )

      onLocalThoughts?.(thoughtsChunk)
    })

    // get remote thoughts
    const status = getState().status
    if (status === 'loading' || status === 'loaded') {
      const thoughtsRemoteIterable = getManyDescendants(
        getFirebaseProvider(getState(), dispatch),
        thoughtIds,
        getState,
        {
          maxDepth: maxDepth ?? BUFFER_DEPTH,
        },
      )

      await itForEach(thoughtsRemoteIterable, (thoughtsChunk: ThoughtIndices) => {
        // eslint-disable-next-line fp/no-mutating-methods
        thoughtRemoteChunks.push(thoughtsChunk)
        Object.values(thoughtsChunk.thoughtIndex).forEach(thought => {
          if (!thought.childrenMap) {
            console.error('thought', thought)
            throw new Error('childrenMap missing')
          }
        })

        dispatch(
          updateThoughts({
            thoughtIndexUpdates: thoughtsChunk.thoughtIndex,
            lexemeIndexUpdates: thoughtsChunk.lexemeIndex,
            // temporarily disable local replication when logged in
            local: false,
            remote: false,
          }),
        )

        onRemoteThoughts?.(thoughtsChunk)
      })
    }

    // limit arity of mergeThoughts to 2 so that index does not get passed where a ThoughtIndices is expected
    const thoughtsLocal = thoughtLocalChunks.reduce<ThoughtIndices>(_.ary(mergeThoughts, 2), {
      thoughtIndex: {},
      lexemeIndex: {},
    })

    // limit arity of mergeThoughts to 2 so that index does not get passed where a ThoughtIndices is expected
    const thoughtsRemote = thoughtRemoteChunks.reduce<ThoughtIndices>(_.ary(mergeThoughts, 2), {
      thoughtIndex: {},
      lexemeIndex: {},
    })

    // If the buffer size is reached on any loaded thoughts that are still within view, we will need to invoke flushPending recursively. Queueing updatePending will properly check visibleContexts and fetch any pending thoughts that are visible.
    const pendingThoughts = Object.values({ ...thoughtsLocal.thoughtIndex, ...thoughtsRemote.thoughtIndex }).filter(
      thought => thought.pending,
    )

    // if we are pulling the home context and there are no pending thoughts, but the home parent is marked as pending, it means there are no children and we need to clear the pending status manually
    // https://github.com/cybersemics/em/issues/1344
    const stateNew = getState()

    const homeThought = getThoughtById(stateNew, HOME_TOKEN)
    if (
      Object.keys(pendingThoughts).length === 0 &&
      isPending(stateNew, homeThought) &&
      !(stateNew.autologin && (status === 'disconnected' || status === 'connecting')) &&
      thoughtIds.includes(HOME_TOKEN)
    ) {
      dispatch(
        updateThoughts({
          thoughtIndexUpdates: {
            [HOME_TOKEN]: {
              ...stateNew.thoughts.thoughtIndex[HOME_TOKEN],
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
