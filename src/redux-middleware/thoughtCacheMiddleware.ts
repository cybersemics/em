import _ from 'lodash'
import { Middleware } from 'redux'
import { GenericObject, Nullable } from '../utilTypes'
import { Path } from '../types'
import * as db from '../db'
import { hashContext, pathToContext, unroot } from '../util'
import { getThoughtsOfEncodedContext } from '../selectors'

// only check expanded and update pending thoughts every 10 ms rather than every action
const throttleUpdatePending = 10

// only fetch
const throttleFlushPending = 500

/** Middleware that queues missing contexts from state.expanded to be fetched from the local db. */
const thoughtCacheMiddleware: Middleware = ({ getState, dispatch }) => {

  // track when state.expanded changes
  let lastExpanded: Nullable<GenericObject<boolean>> = null // eslint-disable-line fp/no-let

  // store pending cache entries to update
  let pending: GenericObject<Path> = {} // eslint-disable-line fp/no-let

  /**
   * Adds unloaded contexts from state.expanded to the pending queue.
   */
  const updatePendingThrottled = _.throttle(() => {

    const state = getState()
    const { cursor, expanded, thoughts: { contextIndex } } = state

    const expandedAndCursor = {
      ...expanded,
      ...cursor ? { [hashContext(pathToContext(cursor))]: cursor } : null,
    }

    // TODO: Currently this will always true since expandThoughts generates a new object each time. updateThoughts should instead only update the reference if the expanded have changed.
    // But not if local db is staged
    if (expandedAndCursor === lastExpanded) return

    // get the encoded context keys that are not in the contextIndex
    const expandedKeys = Object.keys(expandedAndCursor)

    // update pending contexts and their children from expandedAndCursor
    pending = _.reduce(expandedKeys, (accum, key) => {
      const context = pathToContext(expandedAndCursor[key])
      const children = getThoughtsOfEncodedContext(state, key)
      return {
        ...accum,

        // current thought
        ...contextIndex[key] && contextIndex[key].pending ? { [key]: context } : null,

        // because only parents are specified by expandedAndCursor, we need to queue the children as well
        ...children.reduce((accumChildren, child) => {
          const contextChild = unroot([...context, child.value])
          const keyChild = hashContext(contextChild)
          return {
            ...accumChildren,
            ...contextIndex[keyChild] && contextIndex[keyChild].pending ? { [keyChild]: contextChild } : null,
          }
        }, {})
      }
    }, pending)

    // update last expandedAndCursor
    lastExpanded = expandedAndCursor

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
