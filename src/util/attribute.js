import { store } from '../store'

import {
  getThoughts,
  pathToContext,
} from '../util'

/** Returns the value of an attribute of the given context. O(children). Use attributeEquals for O(1) attribute equality check. */
export const attribute = (state, pathOrContext, attr) => {

  const context = pathToContext(pathOrContext)
  const children = getThoughts(state, context.concat(attr))

  // lazy evaluation
  const hasAttribute = () => pathToContext(getThoughts(state, context)).includes(attr)

  // differentiate between no attribute (return undefined) and an attribute with no children (return null)
  return children.length > 0 ? children[0].value
    : hasAttribute() ? null
    : undefined
}
