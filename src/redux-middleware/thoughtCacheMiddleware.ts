import _ from 'lodash'
import { Middleware } from 'redux'
import { GenericObject } from '../utilTypes'
import { Path } from '../types'
import * as db from '../db'
import { hashContext, pathToContext, unroot } from '../util'
import { getThoughtsOfEncodedContext } from '../selectors'
import { State } from '../util/initialState'

// only check expanded and update pending thoughts every 10 ms rather than every action
const throttleUpdatePending = 10

// only fetch
const throttleFlushPending = 500

/** Middleware that queues missing contexts from state.expanded to be fetched from the local db. */
const thoughtCacheMiddleware: Middleware = ({ getState, dispatch }) => {

  // track when visible contexts change
  let lastVisibleContexts: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  // store pending cache entries to update
  let pending: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  /**
   * Adds unloaded contexts based on cursor and state.expanded to the pending queue.
   */
  const updatePendingThrottled = _.throttle(() => {

    const state: State = getState()
    const { cursor, expanded, thoughts: { contextIndex } } = state

    // include expanded, cursor, and all cursor ancestors
    const visibleContexts: GenericObject<Path> = {
      ...expanded,
      // generate the cursor and all its ancestors
      // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
      ...cursor ? cursor.reduce((accum, child, i) => {
        const path = cursor.slice(0, cursor.length - i)
        return {
          ...accum,
          ...path.length > 0 ? { [hashContext(pathToContext(path))]: path } : null
        }
      }, {}) : null,
    }

    // TODO: Currently this will always true since expandThoughts generates a new object each time. updateThoughts should instead only update the reference if the expanded have changed.
    // But not if local db is staged
    if (visibleContexts === lastVisibleContexts) return

    // get the encoded context keys that are not in the contextIndex
    const expandedKeys = Object.keys(visibleContexts)

    // update pending contexts and their children
    pending = _.reduce(expandedKeys, (accum, key) => {
      const context = pathToContext(visibleContexts[key])
      const children = getThoughtsOfEncodedContext(state, key)
      return {
        ...accum,

        // current thought
        // Typescript cannot see the truthy check for some reason (?)
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

    // update last visibleContexts
    lastVisibleContexts = visibleContexts

  }, throttleUpdatePending)

  /**
   * Fetch descendant thoughts
   * WARNING: Unknown behavior if thoughtsPending takes longer than throttleFlushPending.
   */
  const flushPendingThrottled = _.throttle(async () => {

    if (Object.keys(pending).length === 0) return

    // fetch descendant thoughts for each pending context
    const thoughtsPending = await Promise.all(Object.keys(pending).map(key =>
      db.getDescendantThoughts(pathToContext(pending[key]), { maxDepth: 2 })
    ))

    // aggregate thoughts from all pending descendants
    const thoughts = thoughtsPending.reduce((accum, result) => ({
      ...accum,
      contextIndex: {
        ...accum.contextIndex,
        ...result.contextIndex,
      },
      thoughtIndex: {
        ...accum.thoughtIndex,
        ...result.thoughtIndex,
      },
    }), { contextIndex: {}, thoughtIndex: {} })

    // update thoughts
    dispatch({
      type: 'updateThoughts',
      contextIndexUpdates: thoughts.contextIndex,
      thoughtIndexUpdates: thoughts.thoughtIndex,
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
    updatePendingThrottled()
    flushPendingThrottled()
  }
}

export default thoughtCacheMiddleware
