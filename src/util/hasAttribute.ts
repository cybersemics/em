import { store } from '../store'

// util
import {
  pathToContext,
} from '../util'

// selectors
import {
  getThoughts,
} from '../selectors'
import { Path, Context } from '../types'

/** Returns true if the given context has an attribute. O(children). */
export const hasAttribute = (pathOrContext: Path | Context, attributeName: string, { state = store.getState() } = {}) => {
  const context = pathToContext(pathOrContext)
  return pathToContext(getThoughts(state, context)).includes(attributeName)
}
