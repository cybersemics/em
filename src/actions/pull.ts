import _ from 'lodash'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Thunk from '../@types/Thunk'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import { HOME_TOKEN } from '../constants'
import fetchDescendants from '../data-providers/data-helpers/fetchDescendants'
import db from '../data-providers/yjs/thoughtspace'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import getThoughtById from '../selectors/getThoughtById'
import isPending from '../selectors/isPending'
import mergeThoughts from '../util/mergeThoughts'

const BUFFER_DEPTH = 2

export interface PullOptions {
  /** See: cancelRef param to fetchDescendants. */
  cancelRef?: { canceled: boolean }
  /** Pull descendants regardless of pending status. */
  force?: boolean
  maxDepth?: number
}

/** Iterate through an async iterable and invoke a callback on each yield. */
async function itForEach<T>(it: AsyncIterable<T>, callback: (value: T) => void) {
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
export const pullActionCreator =
  (thoughtIds: ThoughtId[], { cancelRef, force, maxDepth }: PullOptions = {}): Thunk<Promise<Thought[]>> =>
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

    const thoughtsIterable = fetchDescendants(db, filteredThoughtIds, getState, {
      cancelRef,
      maxDepth: maxDepth ?? BUFFER_DEPTH,
    })

    await itForEach(thoughtsIterable, (thoughtsChunk: ThoughtIndices) => {
      thoughtChunks.push(thoughtsChunk)

      // mergeUpdates will prevent overwriting non-pending thoughtsChunk with pending thoughtsChunk
      // cannot set isLoading to false here because we do not know which chunk contains the root context
      dispatch(
        updateThoughts({
          thoughtIndexUpdates: thoughtsChunk.thoughtIndex,
          lexemeIndexUpdates: thoughtsChunk.lexemeIndex,
          local: false,
          remote: false,
        }),
      )
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
          isLoading: false,
        }),
      )
    }

    return pendingThoughts
  }
