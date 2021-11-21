import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import {
  expandThoughts,
  getAllChildrenByContextHash,
  getContextForThought,
  getContexts,
  getVisibleContexts,
  hasPushes,
  isContextViewActive,
} from '../selectors'
import { equalArrays, getThoughtIdByContext, head, keyValueBy, unroot } from '../util'
import { pull } from '../action-creators'
import { ThoughtId, Context, Index, State, ThoughtContext } from '../@types'

/** Debounce visible thought checks to avoid checking on every action. */
const updatePullQueueDelay = 10

/** Limit frequency of fetching pull queue contexts. Ignored on first flush. */
const flushPullQueueDelay = 500

/** Creates the initial pullQueue with only the em and root contexts. */
const initialPullQueue = (): Index<Context> => ({
  [EM_TOKEN]: [EM_TOKEN],
  [HOME_TOKEN]: [HOME_TOKEN],
})

/** Appends all visible contexts and their children to the pullQueue. */
const appendVisibleContexts = (state: State, pullQueue: Index<Context>, visibleContexts: Index<Context>) => {
  const {
    thoughts: { contextIndex },
  } = state

  // get the encoded context keys that are not in the contextIndex
  const expandedKeys = Object.keys(visibleContexts) as ThoughtId[]

  return keyValueBy(
    expandedKeys,
    key => {
      const context = visibleContexts[key]
      const showContexts = isContextViewActive(state, context)

      const children = showContexts
        ? getContexts(state, head(context))
        : (getAllChildrenByContextHash(state, key) as (ThoughtId | ThoughtContext)[])

      return {
        // current thought
        ...(!contextIndex[key] || contextIndex[key].pending ? { [key]: context } : null),

        // because only parents are specified by visibleContexts, we need to queue the children as well
        ...keyValueBy(children, child => {
          const contextChild = showContexts ? getContextForThought(state, child)! : unroot([...context, child])
          const keyChildId = getThoughtIdByContext(state, contextChild)
          return keyChildId && contextIndex[keyChildId] && contextIndex[keyChildId].pending
            ? { [keyChildId]: contextChild }
            : null
        }),
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

  // track when visible contexts change
  let lastVisibleContexts: Index<Context> = {} // eslint-disable-line fp/no-let

  // track when search contexts change
  let lastSearchContexts: State['searchContexts'] = {} // eslint-disable-line fp/no-let

  // queque contexts entries to be pulled from the data source
  // initialize with em and root contexts
  // eslint-disable-next-line fp/no-let
  let pullQueue = initialPullQueue()

  /** Flush the pull queue, pulling them from local and remote and merge them into state. Triggers updatePullQueue if there are any pending thoughts. */
  const flushPullQueue = async ({ forcePull }: { forcePull?: boolean } = {}) => {
    // expand pull queue to include visible descendants and search contexts
    const extendedPullQueue = appendVisibleContexts(getState(), pullQueue, {
      ...lastVisibleContexts,
      ...lastSearchContexts,
    })

    pullQueue = {}

    // if there are any pending thoughts remaining after the pull, we need to add them to the pullQueue and immediately flush
    const hasMorePending = await dispatch(pull(extendedPullQueue, { force: forcePull }))

    const { user } = getState()
    if (!user && hasMorePending) {
      updatePullQueue({ forceFlush: true, forcePull })
    }
  }

  /**
   * Adds unloaded contexts based on cursor and state.expanded to the pull queue.
   *
   * @param forceFlush   Calculates a new pullQueue and ignores memoization so that flush is guaranteed.
   * @param forcePull    Passes force: true to pull to fetch all descendants up to the buffer depth, not just pending. Implies forceFlush.
   */
  const updatePullQueue = ({ forceFlush, forcePull }: { forceFlush?: boolean; forcePull?: boolean } = {}) => {
    // if updatePullQueue is called directly, do not allow updatePullQueueDebounced to call it again
    updatePullQueueDebounced.cancel()

    // If we are forcing, cancel the existing throttled flush since it could outrace this flush and pull without force.
    // This can cause remote thoughts to not be pulled on load if thoughts are already loaded from the local db.
    if (forceFlush || forcePull) {
      flushPullQueueThrottled.cancel()
    }

    const state = getState()

    // do nothing if there are pending syncs
    // must do this within this (debounced) function, otherwise state.pushQueue will still be empty
    if (hasPushes(state)) return

    const isSearchSame =
      state.searchContexts === lastSearchContexts ||
      equalArrays(Object.keys(state.searchContexts ?? {}), Object.keys(lastSearchContexts ?? {}))

    const expandedContexts = expandThoughts(state, state.cursor, {
      returnContexts: true,
    })

    // return if expanded is the same, unless force is specified or expanded is empty
    if (
      !forceFlush &&
      !forcePull &&
      Object.keys(state.expanded).length > 0 &&
      equalArrays(Object.keys(expandedContexts), Object.keys(lastExpanded)) &&
      isSearchSame
    )
      return

    // TODO: Can we use only lastExpanded and get rid of lastVisibleContexts?
    // if (!force && equalArrays(Object.keys(state.expanded), Object.keys(lastExpanded))) return

    lastExpanded = expandedContexts

    const visibleContexts = getVisibleContexts(state, expandedContexts)

    if (
      !forceFlush &&
      !forcePull &&
      equalArrays(Object.keys(visibleContexts), Object.keys(lastVisibleContexts)) &&
      isSearchSame
    )
      return

    // update last visibleContexts
    lastVisibleContexts = visibleContexts

    // update last searchContexts
    lastSearchContexts = state.searchContexts

    // do not throttle initial flush or flush on authenticate
    if (isLoaded) {
      flushPullQueueThrottled({ forcePull })
    } else {
      flushPullQueue({ forcePull })
      isLoaded = true
    }
  }

  const updatePullQueueDebounced = _.debounce(updatePullQueue, updatePullQueueDelay)
  const flushPullQueueThrottled = _.throttle(flushPullQueue, flushPullQueueDelay)

  return next => async action => {
    next(action)

    // reset internal state variables when clear action is dispatched
    if (action.type === 'clear') {
      lastExpanded = {}
      lastVisibleContexts = {}
      pullQueue = initialPullQueue()
    }
    // Update pullQueue and flush on authenticate to force a remote fetch and make remote-only updates.
    // Otherwise, because thoughts are previously loaded from local storage which turns off pending on the root context, a normal pull will short circuit and remote thoughts will not be loaded.
    else if (action.type === 'authenticate' && action.value) {
      pullQueue = { ...pullQueue, ...initialPullQueue() }
      updatePullQueue({ forcePull: true })
    }
    // do not updatePullQueue if there are syncs queued or in progress
    // this gets checked again in updatePullQueue, but short circuit here if possible
    else if (!hasPushes(getState())) {
      updatePullQueueDebounced()
    }
  }
}

export default pullQueueMiddleware
