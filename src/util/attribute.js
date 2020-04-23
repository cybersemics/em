import { store } from '../store'

import {
  getThoughts,
  pathToContext,
} from '../util'

/** Returns the value of an attribute of the given context. O(children). Use attributeEquals for O(1) attribute equality check. */
export const attribute = (pathOrContext, attributeName, { state = store.getState() } = {}) => {

  const children = getThoughts(pathToContext(pathOrContext).concat(attributeName), state.thoughtIndex, state.contextIndex)

  // lazy evaluation
  const hasAttribute = () => pathToContext(getThoughts(pathToContext(pathOrContext), state.thoughtIndex, state.contextIndex)).includes(attributeName)

  // differentiate between no attribute (return undefined) and an attribute with no children (return null)
  return children.length > 0 ? children[0].value
    : hasAttribute() ? null
    : undefined
}
