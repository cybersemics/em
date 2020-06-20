import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { GenericObject } from '../utilTypes'
import { Path } from '../types'
import * as db from '../data-providers/dexie'
import * as firebaseProvider from '../data-providers/firebase'
// import { loadRemoteState } from '../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../constants'
import { getThoughtsOfEncodedContext } from '../selectors'
import { equalArrays, hashContext, pathToContext, unroot } from '../util'
import { State } from '../util/initialState'

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

/** Gets a map of all pending visible contexts and their children. */
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
const thoughtCacheMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {

  // track when expanded changes
  let lastExpanded: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  // track when visible contexts change
  let lastVisibleContexts: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  // store pending cache entries to update
  let pending: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  /**
   * Adds unloaded contexts based on cursor and state.expanded to the pending queue.
   */
  const updatePending = () => {

    const state = getState()

    if (state.expanded === lastExpanded) return

    lastExpanded = state.expanded

    const visibleContexts = getVisibleContexts(state)

    if (equalArrays(Object.keys(visibleContexts), Object.keys(lastVisibleContexts))) return

    // update pending contexts and their children
    pending = nextPending(state, pending, visibleContexts)

    // update last visibleContexts
    lastVisibleContexts = visibleContexts

    flushPendingThrottled()
  }

  /**
   * Fetch descendants of thoughts.
   * WARNING: Unknown behavior if thoughtsPending takes longer than throttleFlushPending.
   */
  const flushPending = async () => {

    if (Object.keys(pending).length === 0) return

    // shallow copy pending in case local fetch takes longer than next flush
    const pendingThoughts = { ...pending }

    // clear pending list immediately
    pending = {}

    // get local thoughts
    const thoughtsLocal = await db.getManyDescendants(pendingThoughts, { maxDepth: bufferDepth })

    // get remote thoughts and reconcile with local
    if (getState().user) {
      // do not await
      firebaseProvider.getManyDescendants(pendingThoughts, { maxDepth: bufferDepth })
        .then(thoughtsRemote => {

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

    // TODO: Update only thoughts for which shouldUpdate is false in reconcile and remove redundant updateThoughts. Entries for which shouldUpdate is true are updated anyway.
    dispatch({
      type: 'updateThoughts',
      contextIndexUpdates: thoughtsLocal.contextIndex,
      thoughtIndexUpdates: thoughtsLocal.thoughtIndex,
      local: false,
      remote: false,
    })

  }

  const updatePendingDebounced = _.debounce(updatePending, debounceUpdatePending)
  const flushPendingThrottled = _.throttle(flushPending, throttleFlushPending)

  return next => action => {
    next(action)
    updatePendingDebounced()
  }
}

export default thoughtCacheMiddleware
