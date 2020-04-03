import { Child, Context } from '../types'

// util
import {
  compareThought,
  getThought,
  hashContext,
  sort,
} from '../util'

/** Generates children sorted by their values. */
const getThoughtsSorted = (state: any, context: Context) =>
  sort(
    (state.contextIndex[hashContext(context)] || [])
      .filter((child: Child) => child.value != null && getThought(child.value, state.thoughtIndex)),
    compareThought
  )

// useful for debugging
// @ts-ignore
window.getThoughtsSorted = getThoughtsSorted

export default getThoughtsSorted
