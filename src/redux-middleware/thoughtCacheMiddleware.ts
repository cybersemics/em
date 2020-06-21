import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { GenericObject } from '../utilTypes'
import { Context, Path } from '../types'
import * as db from '../data-providers/dexie'
import * as firebaseProvider from '../data-providers/firebase'
// import { loadRemoteState } from '../action-creators'
import { EM_TOKEN, ROOT_TOKEN } from '../constants'
import { decodeContextUrl, getThoughtsOfEncodedContext } from '../selectors'
import { equalArrays, hashContext, pathToContext, unroot } from '../util'
import { State } from '../util/initialState'

/** Debounce pending checks to avoid checking on every action. */
const debounceUpdatePending = 10

/** Limit frequency of fetching pending contexts. Ignored on first flush. */
const throttleFlushPending = 500

/* Number of levels of descendants of each pending contexts to fetch. */
const bufferDepth = 2

/** Generates a map of all visible contexts, including the cursor, all its ancestors, and the expanded contexts. */
const getVisibleContexts = (state: State): GenericObject<Context> => {
  const { cursor, expanded } = state

  // if there is no cursor, decode the url so the cursor can be loaded
  // after loading the ranks will be inferred to update the cursor
  const contextUrl = decodeContextUrl(state, window.location.pathname)
  const contextCursor = cursor ? pathToContext(cursor) : contextUrl

  return {
    ..._.mapValues(expanded, pathToContext),
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...contextCursor.reduce((accum, value, i) => {
      const subcontext = contextCursor.slice(0, contextCursor.length - i)
      return {
        ...accum,
        ...subcontext.length > 0 ? { [hashContext(subcontext)]: subcontext } : null
      }
    }, {}),
  }
}

/** Gets a map of all pending visible contexts and their children. */
const nextPending = (state: State, pending: GenericObject<Context>, visibleContexts: GenericObject<Context>) => {

  const { thoughts: { contextIndex } } = state

  // get the encoded context keys that are not in the contextIndex
  const expandedKeys = Object.keys(visibleContexts)

  return _.reduce(expandedKeys, (accum, key) => {
    const context = visibleContexts[key]
    const children = getThoughtsOfEncodedContext(state, key)
    return {
      ...accum,

      // current thought
      // @ts-ignore
      ...!contextIndex[key] || contextIndex[key].pending ? { [key]: context } : null,

      // because only parents are specified by visibleContexts, we need to queue the children as well
      ...children.reduce((accumChildren, child) => {
        const contextChild = unroot([...context, child.value])
        const keyChild = hashContext(contextChild)
        return {
          ...accumChildren,
          // Typescript cannot see the truthy check for some reason (?)
          // @ts-ignore
          ...contextIndex[keyChild] && contextIndex[keyChild].pending ? { [keyChild]: contextChild } : null,
        }
      }, {})
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
  let lastExpanded: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  // track when visible contexts change
  let lastVisibleContexts: GenericObject<Context> = {} // eslint-disable-line fp/no-let

  // store pending cache entries to update
  // initialize with em and root contexts
  // eslint-disable-next-line fp/no-let
  let pending: GenericObject<Context> = {
    [hashContext([EM_TOKEN])]: [EM_TOKEN],
    [hashContext([ROOT_TOKEN])]: [ROOT_TOKEN],
  }

  /**
   * Adds unloaded contexts based on cursor and state.expanded to the pending queue.
   *
   * @param force   Calculates a new pending and forces flushPending.
   */
  const updatePending = ({ force }: { force?: boolean } = {}) => {

    const state = getState()

    // bail if expanded is the same, unless force is specified
    if (!force && (state.expanded === lastExpanded || equalArrays(Object.keys(state.expanded), Object.keys(lastExpanded)))) return

    // TODO: Can we use only lastExpanded and get rid of lastVisibleContexts?
    // if (!force && equalArrays(Object.keys(state.expanded), Object.keys(lastExpanded))) return

    lastExpanded = state.expanded

    const visibleContexts = getVisibleContexts(state)
    // console.log('visibleContexts', visibleContexts)

    // it is possible the expanded
    if (!force && equalArrays(Object.keys(visibleContexts), Object.keys(lastVisibleContexts))) return

    // expand pending to include its children
    pending = nextPending(state, pending, visibleContexts)
    // console.log('pending', pending)

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

  /**
   * Fetch descendants of thoughts.
   * WARNING: Unknown behavior if thoughtsPending takes longer than throttleFlushPending.
   */
  const flushPending = async () => {

    console.log('')
    console.log('flushPending')

    // shallow copy pending in case local fetch takes longer than next flush
    const pendingThoughts = { ...pending }

    // console.log('flush', pendingThoughts)

    if (Object.keys(pendingThoughts).length === 0) return

    const user = getState().user

    // clear pending list immediately
    pending = {}

    // get local thoughts
    const thoughtsLocal = await db.getManyDescendants(pendingThoughts, { maxDepth: bufferDepth })

    // get remote thoughts and reconcile with local
    console.log('user', !!user)
    if (user) {
      // do not await
      firebaseProvider.getManyDescendants(pendingThoughts, { maxDepth: bufferDepth })
        .then(thoughtsRemote => {
          // console.log('thoughtsRemote', thoughtsRemote)

          dispatch({
            type: 'reconcile',
            thoughtsResults: [thoughtsLocal, thoughtsRemote]
          })

          // need to delay re-render for some reason
          setTimeout(() => {
            dispatch({ type: 'render' })
          })

        })
    }

    // console.log('thoughtsLocal', thoughtsLocal)

    // TODO: Update only thoughts for which shouldUpdate is false in reconcile and remove redundant updateThoughts. Entries for which shouldUpdate is true are updated anyway.
    dispatch({
      type: 'updateThoughts',
      contextIndexUpdates: thoughtsLocal.contextIndex,
      thoughtIndexUpdates: thoughtsLocal.thoughtIndex,
      local: false,
      remote: false,
    })

    dispatch({ type: 'render' })

    // If the buffer size is reached on any loaded thoughts that are still within view, we will need to invoke flushPending recursively. Queueing updatePending wil properly check visibleContexts and fetch any pending thoughts that are visible.
    const hasPending = Object.keys(thoughtsLocal.contextIndex)
      .some(key => thoughtsLocal.contextIndex[key].pending)
    if (!user && hasPending) {
      updatePending({ force: true })
    }
  }

  const updatePendingDebounced = _.debounce(updatePending, debounceUpdatePending)
  const flushPendingThrottled = _.throttle(flushPending, throttleFlushPending)

  return next => action => {

    // check first authenticate before reducer is called
    const isFirstAuthenticate = action.type === 'authenticate' && !getState().user

    next(action)

    // update pending and flush on initial authenticate to force a remote fetch
    if (isFirstAuthenticate) {
      updatePending({ force: true })
    }
    // otherwise update pending for next flush
    else {
      updatePendingDebounced()
    }
  }
}

export default thoughtCacheMiddleware
