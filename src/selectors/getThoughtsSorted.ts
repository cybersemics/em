import { Child, Context } from '../types'
import { compareThought, sort } from '../util'
import { getThought, getThoughts } from '../selectors'

/** Generates children sorted by their values. */
const getThoughtsSorted = (state: any, context: Context) =>
  sort(
    getThoughts(state, context)
      .filter((child: Child) => child.value != null && getThought(state, child.value)),
    compareThought
  )

export default getThoughtsSorted
