import { store } from '../store.js'

// util
import {
  compareThought,
  getThought,
  getThoughts,
  sort,
} from '../util'

/** Generates children sorted by their values. */
export const getThoughtsSorted = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  return sort(
    getThoughts(context, thoughtIndex, contextIndex)
      .filter(child => child.value != null && getThought(child.value, thoughtIndex)),
    compareThought
  )
}

// useful for debugging
window.getThoughtsSorted = getThoughtsSorted
