import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { EM_TOKEN, ROOT_TOKEN } from '../constants'
import { decodeContextUrl, getAllChildrenByContextHash, hasSyncs } from '../selectors'
import { equalArrays, hashContext, keyValueBy, pathToContext, unroot } from '../util'
import { pull } from '../action-creators'
import { State } from '../util/initialState'
import { Context, ContextHash, Index, Path } from '../types'

/** Debounce pending checks to avoid checking on every action. */
const debounceUpdatePending = 10

/** Limit frequency of fetching pending contexts. Ignored on first flush. */
const throttleFlushPending = 500

/** Generates a map of all visible contexts, including the cursor, all its ancestors, and the expanded contexts. */
const getVisibleContexts = (state: State): Index<Context> => {

  const { cursor, expanded } = state

  // if there is no cursor, decode the url so the cursor can be loaded
  // after loading the ranks will be inferred to update the cursor
  const contextUrl = decodeContextUrl(state, window.location.pathname)
  const contextCursor = cursor ? pathToContext(cursor) : contextUrl

  return {
    ..._.mapValues(expanded, pathToContext),
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...keyValueBy(contextCursor, (value, i) => {
      const subcontext = contextCursor.slice(0, contextCursor.length - i)
      return subcontext.length > 0 ? { [hashContext(subcontext)]: subcontext } : null
    }),
  }
}

/** Gets a map of all pending visible contexts and their children. */
const nextPending = (state: State, pending: Index<Context>, visibleContexts: Index<Context>) => {

  const { thoughts: { contextIndex } } = state

  // get the encoded context keys that are not in the contextIndex
  const expandedKeys = Object.keys(visibleContexts) as ContextHash[]

  return keyValueBy(expandedKeys, key => {
    const context = visibleContexts[key]
    const children = getAllChildrenByContextHash(state, key)
    return {
      // current thought
      ...!contextIndex[key] || contextIndex[key].pending ? { [key]: context } : null,

      // because only parents are specified by visibleContexts, we need to queue the children as well
      ...keyValueBy(children, child => {
        const contextChild = unroot([...context, child.value])
        const keyChild = hashContext(contextChild)
        return contextIndex[keyChild] && contextIndex[keyChild].pending ? { [keyChild]: contextChild } : null
      })
    }
  }, pending)
}

/** Middleware that manages the in-memory thought cache (state.thoughts). Marks contexts to be loaded based on cursor and expanded contexts. Queues missing contexts every (debounced) action so that they may be fetched from the data providers and flushes the queue at a throttled interval.
 *
 * There are two main functions that are called after every action, albeit debounced and throttled, respectively:
 * - updatePendingDebounced.
 * - flushPendingThrottled.
 */
const thoughtCacheMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {

  // use isLoaded to ignore throttling on first load
  let isLoaded = false // eslint-disable-line fp/no-let

  // track when expanded changes
  let lastExpanded: Index<Path> = {} // eslint-disable-line fp/no-let

  // track when visible contexts change
  let lastVisibleContexts: Index<Context> = {} // eslint-disable-line fp/no-let

  // store pending cache entries to update
  // initialize with em and root contexts
  // eslint-disable-next-line fp/no-let
  let pending: Index<Context> = {
    [hashContext([EM_TOKEN])]: [EM_TOKEN],
    [hashContext([ROOT_TOKEN])]: [ROOT_TOKEN],
  }

  /** Flush all pending thoughts, pulling them from local and remote and merge them into state. */
  const flushPending = async () => {

    const pendingThoughts = { ...pending }
    pending = {}

    const hasMorePending = await dispatch(pull({ ...pendingThoughts }))

    const { user } = getState()
    if (!user && hasMorePending) {
      updatePending({ force: true })
    }
  }

  /**
   * Adds unloaded contexts based on cursor and state.expanded to the pending queue.
   *
   * @param force   Calculates a new pending and forces flushPending.
   */
  const updatePending = ({ force }: { force?: boolean } = {}) => {

    // if updatePending is called directly, do not allow updatePendingDebounced to call it again
    updatePendingDebounced.cancel()

    const state = getState()

    // return if there are pending syncs
    // must do this within this (debounced) function, otherwise state.syncQueue will still be empty
    if (hasSyncs(state)) return

    // return if expanded is the same, unless force is specified or expanded is empty
    if (!force && Object.keys(state.expanded).length > 0 && (state.expanded === lastExpanded || equalArrays(Object.keys(state.expanded), Object.keys(lastExpanded)))) return

    // TODO: Can we use only lastExpanded and get rid of lastVisibleContexts?
    // if (!force && equalArrays(Object.keys(state.expanded), Object.keys(lastExpanded))) return

    lastExpanded = state.expanded

    const visibleContexts = getVisibleContexts(state)

    // it is possible the expanded
    if (!force && equalArrays(Object.keys(visibleContexts), Object.keys(lastVisibleContexts))) return

    // expand pending to include its children
    pending = nextPending(state, pending, visibleContexts)

    // update last visibleContexts
    lastVisibleContexts = visibleContexts

    // do not throttle initial flush
    if (isLoaded) {
      flushPendingThrottled()
    }
    else {
      flushPending()
      isLoaded = true
    }
  }

  const updatePendingDebounced = _.debounce(updatePending, debounceUpdatePending)
  const flushPendingThrottled = _.throttle(flushPending, throttleFlushPending)

  return next => async action => {

    next(action)

    // reset internal state variables when clear action is dispatched
    if (action.type === 'clear') {
      lastExpanded = {}
      lastVisibleContexts = {}
      pending = {
        [hashContext([EM_TOKEN])]: [EM_TOKEN],
        [hashContext([ROOT_TOKEN])]: [ROOT_TOKEN],
      }
    }
    // update pending and flush on authenticate to force a remote fetch and make remote-only updates
    else if (action.type === 'authenticate' && action.value) {
      pending[hashContext([EM_TOKEN])] = [EM_TOKEN]
      pending[hashContext([ROOT_TOKEN])] = [ROOT_TOKEN]
      updatePending({ force: true })
    }
    // do not updatePending if there are syncs queued or in progress
    // this gets checked again in updatePending, but short circuit here if possible
    else if (!hasSyncs(getState())) {
      updatePendingDebounced()
    }
  }
}

export default thoughtCacheMiddleware
