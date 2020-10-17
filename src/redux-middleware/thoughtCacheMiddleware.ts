import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import * as db from '../data-providers/dexie'
import * as firebaseProvider from '../data-providers/firebase'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import { EM_TOKEN, ROOT_TOKEN } from '../constants'
import { decodeContextUrl, getThoughtsOfEncodedContext, hasSyncs } from '../selectors'
import { equalArrays, hashContext, mergeThoughts, pathToContext, unroot } from '../util'
import { State, ThoughtsInterface } from '../util/initialState'
import { Context, Index, Lexeme, Parent, Path } from '../types'

/** Debounce pending checks to avoid checking on every action. */
const debounceUpdatePending = 10

/** Limit frequency of fetching pending contexts. Ignored on first flush. */
const throttleFlushPending = 500

/* Number of levels of descendants of each pending contexts to fetch. */
const bufferDepth = 2

/** Iterate through an async iterable and invoke a callback on each yield. */
async function itForEach<T> (it: AsyncIterable<T>, callback: (value: T) => void) {
  // eslint-disable-next-line fp/no-loops
  for await (const item of it) {
    callback(item)
  }
}

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
const nextPending = (state: State, pending: Index<Context>, visibleContexts: Index<Context>) => {

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

  /**
   * Fetch descendants of thoughts.
   * WARNING: Unknown behavior if thoughtsPending takes longer than throttleFlushPending.
   */
  const flushPending = async () => {

    // shallow copy pending in case local fetch takes longer than next flush
    const pendingThoughts = { ...pending }

    if (Object.keys(pendingThoughts).length === 0) return

    // clear pending list immediately
    pending = {}

    // get local thoughts
    const thoughtChunks: ThoughtsInterface[] = []

    const thoughtsLocalIterable = getManyDescendants(db, pendingThoughts, { maxDepth: bufferDepth })
    for await (const thoughts of thoughtsLocalIterable) { // eslint-disable-line fp/no-loops

      // eslint-disable-next-line fp/no-mutating-methods
      thoughtChunks.push(thoughts)

      // TODO: Update only thoughts for which shouldUpdate is false in reconcile and remove redundant updateThoughts. Entries for which shouldUpdate is true are updated anyway.
      // mergeUpdates will prevent overwriting non-pending thoughts with pending thoughts
      dispatch({
        type: 'updateThoughts',
        contextIndexUpdates: thoughts.contextIndex,
        thoughtIndexUpdates: thoughts.thoughtIndex,
        local: false,
        remote: false,
      })
    }

    // re-render after local thoughts are all loaded
    dispatch({ type: 'render' })

    const thoughtsLocal = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

    // get remote thoughts and reconcile with local
    const user = getState().user
    if (user) {

      const thoughtsRemoteIterable = getManyDescendants(firebaseProvider, pendingThoughts, { maxDepth: bufferDepth })

      // TODO: Refactor into zipThoughts
      await itForEach(thoughtsRemoteIterable, (thoughtsRemoteChunk: ThoughtsInterface) => {

        // find the corresponding Parents from the local store (if any exist) so it can be reconciled with the remote Parents
        const thoughtsLocalContextIndexChunk = _.transform(thoughtsRemoteChunk.contextIndex, (accum, parentEntryRemote, key) => {
          const parentEntryLocal = thoughtsLocal.contextIndex[key]
          if (parentEntryLocal) {
            accum[key] = parentEntryLocal
          }
        }, {} as Index<Parent>)

        // find the corresponding Lexemes from the local store (if any exist) so it can be reconciled with the remote Lexemes
        const thoughtsLocalThoughtIndexChunk = _.transform(thoughtsRemoteChunk.thoughtIndex, (accum, lexemeRemote, key) => {
          const lexemeLocal = thoughtsLocal.thoughtIndex[key]
          if (lexemeLocal) {
            accum[key] = lexemeLocal
          }
        }, {} as Index<Lexeme>)

        dispatch({
          type: 'reconcile',
          thoughtsResults: [{
            contextIndex: thoughtsLocalContextIndexChunk,
            thoughtIndex: thoughtsLocalThoughtIndexChunk,
          }, thoughtsRemoteChunk]
        })

      })
    }

    // If the buffer size is reached on any loaded thoughts that are still within view, we will need to invoke flushPending recursively. Queueing updatePending will properly check visibleContexts and fetch any pending thoughts that are visible.
    const hasPending = Object.keys(thoughtsLocal.contextIndex || {})
      .some(key => (thoughtsLocal.contextIndex || {})[key].pending)
    if (!user && hasPending) {
      updatePending({ force: true })
    }
  }

  const updatePendingDebounced = _.debounce(updatePending, debounceUpdatePending)
  const flushPendingThrottled = _.throttle(flushPending, throttleFlushPending)

  return next => action => {

    // check first authenticate before reducer is called
    const isFirstAuthenticate = action.type === 'authenticate' && action.value && !getState().user

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
    // update pending and flush on initial authenticate to force a remote fetch
    else if (isFirstAuthenticate) {
      // ensure ROOT and EM are fetched
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
