import { getThoughts } from '../selectors'
import { Context } from '../types'
import { State } from '../util/initialState'

/** Returns true if the given context has a child with the given value. O(children). */
const hasChild = (state: State, context: Context, value: string) =>
  !!getThoughts(state, context).find(child => child.value === value)

export default hasChild
