import { store } from '../store.js'

// util
import { hashContext } from './hashContext.js'

/** Returns the subthoughts of the given context unordered. */
export const getThoughts = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  return contextIndex[hashContext(context)] || []
}
