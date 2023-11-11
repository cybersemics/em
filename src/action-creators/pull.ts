import _ from 'lodash'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Thunk from '../@types/Thunk'
import updateThoughts from '../action-creators/updateThoughts'
import { HOME_TOKEN } from '../constants'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import db from '../data-providers/yjs/thoughtspace.main'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import getThoughtById from '../selectors/getThoughtById'
import isPending from '../selectors/isPending'
import mergeThoughts from '../util/mergeThoughts'

const BUFFER_DEPTH = 2

export interface PullOptions {
  /** See: cancelRef param to getDescendantThoughts. */
  cancelRef?: { canceled: boolean }
  /** Pull descendants regardless of pending status. */
  force?: boolean
  maxDepth?: number
  onThoughts?: (thoughts: ThoughtIndices) => void
}

/** Iterate through an async iterable and invoke a callback on each yield. */
async function itForEach<T>(it: AsyncIterable<T>, callback: (value: T) => void) {
  // eslint-disable-next-line fp/no-loops
  for await (const item of it) {
    callback(item)
  }
}

/** Filters a list of ids to only missing or pending thoughts. */
const filterPending = (state: State, thoughtIds: ThoughtId[]): ThoughtId[] =>
  thoughtIds.filter(thoughtId => {
    const thought = getThoughtById(state, thoughtId)
    return !thought || thought.pending
  })

/** Returns a list of all missing or pending descendants of the given thoughts (inclusive). */
const getPendingDescendants = (state: State, thoughtIds: ThoughtId[]): ThoughtId[] =>
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
  (thoughtIds: ThoughtId[], { cancelRef, force, maxDepth, onThoughts }: PullOptions = {}): Thunk<Promise<Thought[]>> =>
  async (dispatch, getState) => {
    // pull only pending thoughts unless forced
    const filteredThoughtIds = force
      ? thoughtIds
      : // if maxDepth is provided, find pending descendants (e.g. for exporting thoughts and their descendants)
        // otherwise, pull the provided thoughts that are missing or pending
        (Number(maxDepth) > 0 ? getPendingDescendants : filterPending)(getState(), thoughtIds)

    // short circuit if there are no contexts to fetch
    if (filteredThoughtIds.length === 0) return []

    const thoughtChunks: ThoughtIndices[] = []

    const thoughtsIterable = getManyDescendants(db, filteredThoughtIds, getState, {
      cancelRef,
      maxDepth: maxDepth ?? BUFFER_DEPTH,
    })

    // parallelizing may result in conficts since there is no conflict resolution mechanism currently
    await itForEach(thoughtsIterable, (thoughtsChunk: ThoughtIndices) => {
      thoughtChunks.push(thoughtsChunk)

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

      onThoughts?.(thoughtsChunk)
    })

    // get remote thoughts
    const status = getState().status

    // limit arity of mergeThoughts to 2 so that index does not get passed where a ThoughtIndices is expected
    const thoughts = thoughtChunks.reduce<ThoughtIndices>(_.ary(mergeThoughts, 2), {
      thoughtIndex: {},
      lexemeIndex: {},
    })

    // If the buffer size is reached on any loaded thoughts that are still within view, we will need to invoke flushPending recursively. Queueing updatePending will properly check visibleContexts and fetch any pending thoughts that are visible.
    const pendingThoughts = Object.values(thoughts.thoughtIndex).filter(thought => thought.pending)

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
