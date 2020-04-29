import { store } from '../store'

import {
  getThoughts,
  isFunction,
  meta,
  pathToContext,
} from '../util'

/** Returns the value of an attribute of the given context. O(children). Use attributeEquals for O(1) attribute equality check. Use a combination of hasAttribute and attribute to check if an attribute exists but has no children. */
export const attribute = (pathOrContext, attributeName, { state = store.getState() } = {}) => {

  const context = pathToContext(pathOrContext)
  const children = getThoughts([...context, attributeName], state.thoughtIndex, state.contextIndex)

  const notHidden = child => !isFunction(child.value) && !meta([...context, child.value]).hidden
  const firstVisibleChild = children.find(notHidden)

  // differentiate between no attribute (return undefined) and an attribute with no children (return null)
  return firstVisibleChild ? firstVisibleChild.value : null
}
