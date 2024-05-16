import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { pullActionCreator as pull } from '../actions/pull'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../constants'
import db from '../data-providers/yjs/thoughtspace'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import { getChildren } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import syncStatusStore from '../stores/syncStatus'
import equalArrays from '../util/equalArrays'
import hashThought from '../util/hashThought'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'

/** Debounce visible thought checks to avoid checking on every action. */
const updatePullQueueDelay = 10

/** Limit frequency of fetching pull queue contexts. Ignored on first flush. */
const flushPullQueueDelay = 100

/** Tracks if any pulls have executed yet. Used to pull favorites only on the first pull. */
let pulled = false

/** A set of all four root contexts. */
const rootContextSet = new Set<ThoughtId>([ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID])

/** Creates the initial pullQueue with only the em and root contexts. */
const initialPullQueue = (): Record<ThoughtId, true> => ({
  [EM_TOKEN]: true,
  [HOME_TOKEN]: true,
})

/** Generates a map of all visible paths, including the cursor, all its ancestors, and the expanded paths. Keyed by ThoughtId. */
const expandedWithAncestors = (state: State, expanded: Index<Path>): Index<Path> => {
  const { cursor } = state
  const path = cursor || [HOME_TOKEN]

  return {
    ...expanded,
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...keyValueBy(path, (value, i) => {
      const pathAncestor = path.slice(0, path.length - i) as Path
      return pathAncestor.length > 0 ? { [head(pathAncestor)]: pathAncestor } : null
    }),
  }
}

/** Appends all visible paths and their visible children to the pullQueue. */
const appendVisiblePaths = (
  state: State,
  pullQueue: Record<ThoughtId, true>,
  expandedPaths: Index<Path>,
): Record<ThoughtId, true> => {
  return keyValueBy(
    expandedPaths,
    (key, path) => {
      const thoughtId = head(path)
      const thought = getThoughtById(state, thoughtId)
      if (!thought) return null

      const showContexts = isContextViewActive(state, path)

      // get visible children
      const children = showContexts ? getContextsSortedAndRanked(state, thought.value) : getChildren(state, thoughtId)

      return {
        // pending thought
        ...(thought.pending ? { [thoughtId]: true } : null),
        // children
        ...keyValueBy(children, child =>
          // pending child
          child ? { [child.id]: true } : null,
        ),
      }
    },
    pullQueue,
  )
}

/** An action-creator that pulls the =favorite Lexeme and all contexts. */
const pullFavorites = (): Thunk => async (dispatch, getState) => {
  const lexeme = await db.getLexemeById(hashThought('=favorite'))
  return dispatch(pullAncestors(lexeme?.contexts || [], { force: true, maxDepth: 0 }))
}

/** An action-creator that pulls the ancestors of one or more thoughts. */
const pullAncestors =
  (ids: ThoughtId[], { force, maxDepth }: { force?: boolean; maxDepth?: number } = {}): Thunk =>
  async (dispatch, getState) => {
    // pull all ancestors so that breadcrumbs can be displayed
    while (ids.length > 0) {
      await dispatch(pull(ids, { force, maxDepth }))

      // enqueue parents
      const thoughts = childIdsToThoughts(getState(), ids)
      ids = thoughts.map(thought => thought.parentId).filter(id => !rootContextSet.has(id))
    }
  }

/** Middleware that manages the in-memory thought cache (state.thoughts). Marks contexts to be loaded based on cursor and expanded contexts. Queues missing contexts every (debounced) action so that they may be fetched from the data providers and flushes the queue at a throttled interval.
 *
 * There are two main functions that are called after every action, albeit debounced and throttled, respectively:
 * - updatePullQueueDebounced.
 * - flushPullQueueThrottled.
 */
const pullQueueMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  // use isLoaded to ignore throttling on first load
  let isLoaded = false

  // track changed state to short circuit flushPullQueue when no visible thoughts have changed
  let lastContextViews: State['contextViews'] = {}
  let lastExpandedPaths: Index<Path> = {}
  let lastSearchContexts: State['searchContexts'] = {}

  // enqueue thoughts be pulled from the data source
  // initialize with em and root contexts
  let pullQueue = initialPullQueue()

  // A set of Indexes of ThoughtIds that are currently being pulled used to prevent redundant pulls.
  // Each inner object is the extendedPullQueueFiltered of a single pull.
  // The outer object allows the inner objects to be removed in O(1) when the pull is complete.
  const pulling = new Set<Record<ThoughtId, true>>()

  // A cancel ref for thethat can be set to true to terminate recursive replication in fetchDescendants.
  // Re-assigned on each new flush, but the pull will retain a reference to the old object to read that it has been cancelled.
  let cancelRef = { canceled: false }

  // Track the previous cursor so that we can avoid canceling the previous pull when the cursor has not changed.
  // If the cursor is unchanged, then are probably newly expanded descendants that need to be pulled. While fetchDescendants will properly set the pending state to allow the redundant pull, it seems better to avoid it and allow all pulls with the same cursor to complete.
  let prevCursor: Path | null = getState().cursor

  /** Flush the pull queue, pulling them from local and remote and merge them into state. Triggers updatePullQueue if there are any pending thoughts. */
  const flushPullQueue = async ({ force }: { force?: boolean } = {}) => {
    syncStatusStore.update({ isPulling: true })

    // Cancel the previous pull for efficiency.
    // See prevCursor above for why we should only do this when the cursor has changed.
    const cursor = getState().cursor
    if (cursor !== prevCursor) {
      prevCursor = cursor

      // Cancel the ref that is retained by the previous pull.
      // Assigning a new ref does not affect the previous pull.
      cancelRef.canceled = true
      cancelRef = { canceled: false }
    }

    // expand pull queue to include visible descendants and search contexts
    const extendedPullQueue = appendVisiblePaths(getState(), pullQueue, lastExpandedPaths)

    // filter out thoughts that are currently being pulled, except when forcing the initial remote pull
    const extendedPullQueueFiltered = force
      ? extendedPullQueue
      : keyValueBy(extendedPullQueue, id => {
          // use a for loop for short circuiting
          for (const pullQueueRecord of pulling.values()) {
            if (id in pullQueueRecord) return null
          }
          return { [id]: true as const }
        })

    pullQueue = {}

    const extendedPullQueueIds = Object.keys(extendedPullQueueFiltered) as ThoughtId[]

    pulling.add(extendedPullQueueFiltered)

    // if there are any visible pending descendants from the pull, we need to add them to the pullQueue and immediately flush
    await dispatch(pull(extendedPullQueueIds, { cancelRef, force }))
    syncStatusStore.update({ isPulling: false })
    pulling.delete(extendedPullQueueFiltered)

    // pull favorites in the background on the first pull
    // note that syncStatusStore.isPulling does not include favorites because we want them to load in the background and not block push
    if (!pulled) {
      dispatch(pullFavorites())
      pulled = true
    }
  }

  /**
   * Adds unloaded contexts based on cursor and state.expanded to the pull queue.
   *
   * @param forceFlush   Calculates a new pullQueue and ignores memoization so that flush is guaranteed.
   * @param forceRemote    Passes force: true to pull to fetch all descendants up to the buffer depth, not just pending. Implies forceFlush.
   */
  const updatePullQueue = ({ forceFlush, force }: { forceFlush?: boolean; force?: boolean } = {}) => {
    // if updatePullQueue is called directly, do not allow updatePullQueueDebounced to call it again
    updatePullQueueDebounced.cancel()

    // If we are forcing, cancel the existing throttled flush since it could outrace this flush and pull without force.
    // This can cause remote thoughts to not be pulled on load if thoughts are already loaded from the local db.
    if (forceFlush || force) {
      flushPullQueueThrottled.cancel()
    }

    const state = getState()

    const isSearchUnchanged =
      state.searchContexts === lastSearchContexts ||
      equalArrays(Object.keys(state.searchContexts ?? {}), Object.keys(lastSearchContexts ?? {}))

    const expandedPaths = expandedWithAncestors(state, state.expanded)

    if (
      !forceFlush &&
      !force &&
      state.contextViews === lastContextViews &&
      equalArrays(Object.keys(expandedPaths), Object.keys(lastExpandedPaths)) &&
      isSearchUnchanged
    )
      return

    // update last states
    lastExpandedPaths = expandedPaths
    lastSearchContexts = state.searchContexts
    lastContextViews = state.contextViews

    // do not throttle initial flush or flush on authenticate
    if (isLoaded) {
      flushPullQueueThrottled({ force })
    } else {
      flushPullQueue({ force })
      isLoaded = true
    }
  }

  const updatePullQueueDebounced = _.debounce(updatePullQueue, updatePullQueueDelay)
  const flushPullQueueThrottled = _.throttle(flushPullQueue, flushPullQueueDelay)

  return next => async action => {
    next(action)
    const state = getState()

    // reset internal state variables when clear action is dispatched
    if (action.type === 'clear') {
      lastContextViews = {}
      lastExpandedPaths = {}
      lastSearchContexts = {}
      pullQueue = initialPullQueue()
    }
    // Update pullQueue and flush on authenticate to force a remote fetch and make remote-only updates.
    // Otherwise, because thoughts are previously loaded from local storage which turns off pending on the root context, a normal pull will short circuit and remote thoughts will not be loaded.
    else if (action.type === 'authenticate' && action.value && action.connected) {
      pullQueue = { ...pullQueue, ...initialPullQueue() }
      // do not debounce, as forceRemote could be overwritten by other calls to the debounced function
      updatePullQueue({ force: true })
    }
    // do not pull before cursor has been initialized
    else if (state.cursorInitialized) {
      updatePullQueueDebounced()
    }
  }
}

export default pullQueueMiddleware
