import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { expandThoughts, getThoughtById, expandedWithAncestors, thoughtToPath } from '../selectors'
import { equalArrays, hashPath, head, keyValueBy } from '../util'
import { pull } from '../action-creators'
import { ThoughtId, Context, Index, State, Path } from '../@types'

/** Debounce visible thought checks to avoid checking on every action. */
const updatePullQueueDelay = 10

/** Limit frequency of fetching pull queue contexts. Ignored on first flush. */
const flushPullQueueDelay = 500

/** Creates the initial pullQueue with only the em and root contexts. */
const initialPullQueue = (): Record<ThoughtId, true> => ({
  [EM_TOKEN]: true,
  [HOME_TOKEN]: true,
})

/** Appends all visible paths and their children to the pullQueue. */
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
      return {
        ...(!thought || thought.pending ? { [thoughtId]: true } : null),
      }
    },
    pullQueue,
  )
}

/** Middleware that manages the in-memory thought cache (state.thoughts). Marks contexts to be loaded based on cursor and expanded contexts. Queues missing contexts every (debounced) action so that they may be fetched from the data providers and flushes the queue at a throttled interval.
 *
 * There are two main functions that are called after every action, albeit debounced and throttled, respectively:
 * - updatePullQueueDebounced.
 * - flushPullQueueThrottled.
 */
const pullQueueMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  // use isLoaded to ignore throttling on first load
  let isLoaded = false // eslint-disable-line fp/no-let

  // track when expanded changes
  let lastExpanded: Index<Context> = {} // eslint-disable-line fp/no-let

  // track when expanded paths change
  let lastExpandedPaths: Index<Path> = {} // eslint-disable-line fp/no-let

  // track when search contexts change
  let lastSearchContexts: State['searchContexts'] = {} // eslint-disable-line fp/no-let

  // enqueue thoughts be pulled from the data source
  // initialize with em and root contexts
  // eslint-disable-next-line fp/no-let
  let pullQueue = initialPullQueue()

  // a list of indices of ThoughtIds that are currently being pulled
  // used to prevent redundant pulls
  // each inner object is the extendedPullQueueFiltered of a single pull
  // the other object allows the inner objects to be removed in O(1) when the pull is complete
  const pullQueuePulling: Index<Record<ThoughtId, true>> = {}

  // an autoincrement key for pullQueuePulling
  let extendedPullQueuePullingId = 0

  /** Flush the pull queue, pulling them from local and remote and merge them into state. Triggers updatePullQueue if there are any pending thoughts. */
  const flushPullQueue = async ({ forceRemote }: { forceRemote?: boolean } = {}) => {
    // expand pull queue to include visible descendants and search contexts
    const extendedPullQueue = appendVisiblePaths(getState(), pullQueue, lastExpandedPaths)

    // filter out thoughts that are currently being pulled, except when forcing the initial remote pull
    const extendedPullQueueFiltered = forceRemote
      ? extendedPullQueue
      : keyValueBy(extendedPullQueue, id => {
          const isPulling = Object.values(pullQueuePulling).some(pullQueueObject => id in pullQueueObject)
          return isPulling ? null : { [id]: true as const }
        })

    pullQueue = {}

    const extendedPullQueueIds = Object.keys(extendedPullQueueFiltered) as ThoughtId[]

    const pullKey = extendedPullQueuePullingId++
    pullQueuePulling[pullKey] = extendedPullQueueFiltered

    // if there are any visible pending descendants from the pull, we need to add them to the pullQueue and immediately flush
    const pendingThoughts = await dispatch(pull(extendedPullQueueIds, { force: forceRemote, remote: forceRemote }))
    const visiblePendingThoughts = pendingThoughts.filter(
      thought => getState().expanded[hashPath(thoughtToPath(getState(), thought.parentId))],
    )

    // eslint-disable-next-line fp/no-delete
    delete pullQueuePulling[pullKey]

    if (!Math && Object.keys(visiblePendingThoughts).length > 0) {
      pullQueue = { ...pullQueue, ...keyValueBy(visiblePendingThoughts, (thought, i) => ({ [thought.id]: true })) }
      updatePullQueue({ forceFlush: true, forceRemote })
    }
  }

  /**
   * Adds unloaded contexts based on cursor and state.expanded to the pull queue.
   *
   * @param forceFlush   Calculates a new pullQueue and ignores memoization so that flush is guaranteed.
   * @param forceRemote    Passes force: true to pull to fetch all descendants up to the buffer depth, not just pending. Implies forceFlush.
   */
  const updatePullQueue = ({ forceFlush, forceRemote }: { forceFlush?: boolean; forceRemote?: boolean } = {}) => {
    // if updatePullQueue is called directly, do not allow updatePullQueueDebounced to call it again
    updatePullQueueDebounced.cancel()

    // If we are forcing, cancel the existing throttled flush since it could outrace this flush and pull without force.
    // This can cause remote thoughts to not be pulled on load if thoughts are already loaded from the local db.
    if (forceFlush || forceRemote) {
      flushPullQueueThrottled.cancel()
    }

    const state = getState()

    const isSearchSame =
      state.searchContexts === lastSearchContexts ||
      equalArrays(Object.keys(state.searchContexts ?? {}), Object.keys(lastSearchContexts ?? {}))

    const expanded = expandThoughts(state, state.cursor)

    // return if expanded is the same, unless force is specified or expanded is empty
    if (
      !forceFlush &&
      !forceRemote &&
      Object.keys(state.expanded).length > 0 &&
      equalArrays(Object.keys(expanded), Object.keys(lastExpanded)) &&
      isSearchSame
    )
      return
    // TODO: Can we use only lastExpanded and get rid of lastVisibleContexts?
    // if (!force && equalArrays(Object.keys(state.expanded), Object.keys(lastExpanded))) return

    lastExpanded = expanded

    const expandedPaths = expandedWithAncestors(state, expanded)

    if (
      !forceFlush &&
      !forceRemote &&
      equalArrays(Object.keys(expandedPaths), Object.keys(lastExpandedPaths)) &&
      isSearchSame
    )
      return
    // update last lastExpandedPaths
    lastExpandedPaths = expandedPaths

    // update last searchContexts
    lastSearchContexts = state.searchContexts

    // do not throttle initial flush or flush on authenticate
    if (isLoaded) {
      flushPullQueueThrottled({ forceRemote })
    } else {
      flushPullQueue({ forceRemote })
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
      lastExpanded = {}
      lastExpandedPaths = {}
      pullQueue = initialPullQueue()
    }
    // Update pullQueue and flush on authenticate to force a remote fetch and make remote-only updates.
    // Otherwise, because thoughts are previously loaded from local storage which turns off pending on the root context, a normal pull will short circuit and remote thoughts will not be loaded.
    else if (action.type === 'authenticate' && action.value && action.connected) {
      pullQueue = { ...pullQueue, ...initialPullQueue() }
      // do not debounce, as forceRemote could be overwritten by other calls to the debounced function
      updatePullQueue({ forceRemote: true })
    }
    // do not pull before cursor has been initialized
    else if (state.cursorInitialized) {
      updatePullQueueDebounced()
    }
  }
}

export default pullQueueMiddleware
