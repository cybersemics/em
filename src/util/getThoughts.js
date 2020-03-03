import { store } from '../store.js'

// util
import { hashContext } from './hashContext.js'

/** Returns the subthoughts of the given context unordered. */
export const getThoughts = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().present.thoughtIndex
  contextIndex = contextIndex || store.getState().present.contextIndex
  return contextIndex[hashContext(context)] || []
}
