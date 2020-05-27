import { Child, Context } from '../types'

// util
import {
  compareThought,
  hashContext,
  sort,
} from '../util'

// selectors
import { getThought } from '../selectors'

/** Generates children sorted by their values. */
const getThoughtsSorted = (state: any, context: Context) =>
  sort(
    (state.thoughts.contextIndex[hashContext(context)] || [])
      .filter((child: Child) => child.value != null && getThought(state, child.value)),
    compareThought
  )

// useful for debugging
// @ts-ignore
window.getThoughtsSorted = getThoughtsSorted

export default getThoughtsSorted
