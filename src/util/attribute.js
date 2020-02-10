import { store } from '../store.js'

import {
  getThoughts,
  pathToContext,
} from '../util.js'

/** Returns the value of an attributee of the given context */
export const attribute = (pathOrContext, attributeName, { state = store.getState() } = {}) => {
  const children = getThoughts(pathToContext(pathOrContext).concat(attributeName), state.thoughtIndex, state.contextIndex)
  return children.length > 0 ? children[0].value : null
}
