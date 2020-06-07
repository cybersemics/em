import _ from 'lodash'
import { Middleware } from 'redux'
import { GenericObject, Nullable } from '../utilTypes'

/** */
const thoughtCacheMiddleware: Middleware = ({ getState }) => {

  // track when state.expanded changes
  let lastExpanded: Nullable<GenericObject<boolean>> = null // eslint-disable-line fp/no-let

  // store pending cache entries to update
  let pending = {} // eslint-disable-line fp/no-let

  /** Adds uncached keys from state.expanded to the pending queue. */
  const updatePendingThrottled = _.throttle(() => {

    const { thoughts: { contextIndex }, expanded } = getState()

    // TODO: Currently this will always true since expandThoughts generates a new object each time. updateThoughts should instead only update the reference if the expanded have changed.
    if (expanded === lastExpanded) return

    // get the encoded context keys that are not in the contextIndex
    const expandedKeys = Object.keys(expanded)
    const contextIndexKeys = Object.keys(contextIndex)
    const diff = _.difference(expandedKeys, contextIndexKeys)

    // update pending contexts from expanded
    pending = _.reduce(diff, (accum, key) => ({
      ...accum,
      [key]: true
    }), pending)

    // update last expanded
    lastExpanded = expanded

  }, 10)

  return next => action => {
    next(action)
    updatePendingThrottled()
  }
}

export default thoughtCacheMiddleware
