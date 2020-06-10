import _ from 'lodash'
import { Middleware } from 'redux'
import { GenericObject } from '../utilTypes'
import { Path } from '../types'
import * as db from '../db'
import * as firebaseProvider from '../data-providers/firebase'
// import { loadRemoteState } from '../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../constants'
import { getThoughtsOfEncodedContext } from '../selectors'
import { hashContext, pathToContext, sync, unroot } from '../util'
import { State, ThoughtsInterface } from '../util/initialState'

// debounce pending checks to avoid checking on every action
const debounceUpdatePending = 10

// limit frequency of fetching pending contexts
const throttleFlushPending = 500

// levels of descendants of each pending contexts to fetch
const bufferDepth = 2

/** Generates a map of all visible contexts, including the cursor, all its ancestors, and the expanded contexts. */
const getVisibleContexts = (state: State): GenericObject<Path> => {
  const { cursor, expanded } = state
  return {
    ...expanded,
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...cursor ? cursor.reduce((accum, child, i) => {
      const path = cursor.slice(0, cursor.length - i)
      return {
        ...accum,
        ...path.length > 0 ? { [hashContext(pathToContext(path))]: path } : null
      }
    }, {}) : {
      // if there is no cursor, just the root is visible
      [hashContext([ROOT_TOKEN])]: RANKED_ROOT
    },
  }
}

/** Gets a map of all visible contexts and their children. */
const nextPending = (state: State, pending: GenericObject<Path>, visibleContexts: GenericObject<Path>) => {

  const { thoughts: { contextIndex } } = state

  // get the encoded context keys that are not in the contextIndex
  const expandedKeys = Object.keys(visibleContexts)

  return _.reduce(expandedKeys, (accum, key) => {
    const context = pathToContext(visibleContexts[key])
    const children = getThoughtsOfEncodedContext(state, key)
    return {
      ...accum,

      // current thought
      // @ts-ignore
      ...contextIndex[key] && contextIndex[key].pending ? { [key]: context } : null,

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
const thoughtCacheMiddleware: Middleware = ({ getState, dispatch }) => {

  // track when visible contexts change
  let lastVisibleContexts: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  // store pending cache entries to update
  let pending: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  /**
   * Adds unloaded contexts based on cursor and state.expanded to the pending queue.
   * Debounced to avoid checking pending contexts on every action.
   */
  const updatePendingDebounced = _.debounce(() => {

    const state: State = getState()

    const visibleContexts = getVisibleContexts(state)

    // TODO: Currently this will always true since expandThoughts generates a new object each time. updateThoughts should instead only update the reference if the expanded have changed.
    // But not if local db is staged
    if (visibleContexts === lastVisibleContexts) return

    // update pending contexts and their children
    pending = nextPending(state, pending, visibleContexts)

    // update last visibleContexts
    lastVisibleContexts = visibleContexts

  }, debounceUpdatePending)

  /** Compares local and remote lastUpdated. If they are not the same, propagate newest. */
  const reconcile = (thoughtsLocal: ThoughtsInterface, thoughtsRemote: ThoughtsInterface) => {

    /** Returns a predicate that returns true if a key is missing from the given destination object or it was updated more recently than the value in the destination object. The value's children or context properties must not empty. */
    const shouldUpdate = (dest: GenericObject<any> = {}) =>
      (value: any, key: string) =>
        value &&
        (value.children ? value.children.length > 0 : value.contexts.length > 0) &&
        (!(key in dest) || value.lastUpdated > dest[key].lastUpdated)

    // get the thoughts that are missing from either local or remote
    const contextIndexLocalOnly = _.pickBy(thoughtsLocal.contextIndex, shouldUpdate(thoughtsRemote.contextIndex))
    const contextIndexRemoteOnly = _.pickBy(thoughtsRemote.contextIndex, shouldUpdate(thoughtsLocal.contextIndex))
    const thoughtIndexLocalOnly = _.pickBy(thoughtsLocal.thoughtIndex, shouldUpdate(thoughtsRemote.thoughtIndex))
    const thoughtIndexRemoteOnly = _.pickBy(thoughtsRemote.thoughtIndex, shouldUpdate(thoughtsLocal.thoughtIndex))

    // sync remote
    if (Object.keys(contextIndexLocalOnly).length > 0) {
      sync(thoughtIndexLocalOnly, contextIndexLocalOnly, { local: false })
    }

    // sync local
    if (Object.keys(contextIndexRemoteOnly).length > 0) {
      sync(thoughtIndexRemoteOnly, contextIndexRemoteOnly, { remote: false })
    }
  }

  /**
   * Fetch descendant thoughts.
   * WARNING: Unknown behavior if thoughtsPending takes longer than throttleFlushPending.
   */
  const flushPendingThrottled = _.throttle(async () => {

    if (Object.keys(pending).length === 0) return

    // get local thoughts
    const thoughtsLocal = await db.getManyDescendants(pending, { maxDepth: bufferDepth })

    // update remote thoughts
    const { user } = getState()
    if (user) {
      const userId = user.uid
      firebaseProvider.getManyDescendants(userId, pending, { maxDepth: bufferDepth })
        .then(thoughtsRemote => reconcile(thoughtsLocal, thoughtsRemote))
    }

    // update local thoughts
    dispatch({
      type: 'updateThoughts',
      contextIndexUpdates: thoughtsLocal.contextIndex,
      thoughtIndexUpdates: thoughtsLocal.thoughtIndex,
      local: false,
      remote: false,
    })

    // need to explicitly re-render since updateThoughts does not necessarily trigger it
    // needs to be delayed till next tick for some reason as well
    setTimeout(() => {
      dispatch({
        type: 'render'
      })
    })

    // clear pending list
    pending = {}

  }, throttleFlushPending)

  return next => action => {
    next(action)
    updatePendingDebounced()
    flushPendingThrottled()
  }
}

export default thoughtCacheMiddleware
