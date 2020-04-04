import { store } from '../store.js'

// util
import { compareThought } from './compareThought'
import { getThought } from './getThought'
import { hashContext } from './hashContext.js'
import { sort } from './sort.js'

/** Generates children sorted by their values. */
export const getThoughtsSorted = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  return sort(
    (contextIndex[hashContext(context)] || [])
      .filter(child => child.value != null && getThought(child.value, thoughtIndex)),
    compareThought
  )
}

// useful for debugging
window.getThoughtsSorted = getThoughtsSorted
