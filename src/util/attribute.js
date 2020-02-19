import { store } from '../store.js'

import {
  getThoughts,
  pathToContext,
} from '../util.js'

/** Returns the value of an attributee of the given context */
export const attribute = (pathOrContext, attributeName, { state = store.getState() } = {}) => {
  const children = getThoughts(pathToContext(pathOrContext).concat(attributeName), state.thoughtIndex, state.contextIndex)
  const hasAttribute = pathToContext(getThoughts(pathToContext(pathOrContext), state.thoughtIndex, state.contextIndex)).includes(attributeName)

  // differentiate between no attribute (return undefined) and an attribute with no children (return null)
  return !hasAttribute ? undefined
    : children.length > 0 ? children[0].value
      : null
}
