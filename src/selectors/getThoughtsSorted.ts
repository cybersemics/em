import { compareThought, sort } from '../util'
import { getThought, getAllChildren } from '../selectors'
import { State } from '../util/initialState'
import { Child, Context } from '../types'

/** Generates children sorted by their values. */
const getThoughtsSorted = (state: State, context: Context) =>
  sort(
    getAllChildren(state, context)
      .filter((child: Child) => child.value != null && getThought(state, child.value)),
    compareThought
  )

export default getThoughtsSorted
