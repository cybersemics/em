import { store } from '../store'

import {
  getThoughts,
  pathToContext,
} from '../util'

/** Returns true if the given context has an attribute. O(children). */
export const hasAttribute = (pathOrContext, attributeName, { state = store.getState() } = {}) => {
  const context = pathToContext(pathOrContext)
  return pathToContext(getThoughts(context, state.thoughtIndex, state.contextIndex)).includes(attributeName)
}
