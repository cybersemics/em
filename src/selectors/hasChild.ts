import { getAllChildren } from '../selectors'
import { Context, State } from '../types'

/** Returns true if the given context has a child with the given value. O(children). */
const hasChild = (state: State, context: Context, value: string) =>
  !!getAllChildren(state, context).find(child => child.value === value)

export default hasChild
