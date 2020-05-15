//@ts-nocheck

import { store } from '../store'

// util
import {
  pathToContext,
} from '../util'

// selectors
import {
  getThoughts,
} from '../selectors'

/** Returns true if the given context has an attribute. O(children). */
export const hasAttribute = (pathOrContext, attributeName, { state = store.getState() } = {}) => {
  const context = pathToContext(pathOrContext)
  return pathToContext(getThoughts(state, context)).includes(attributeName)
}
