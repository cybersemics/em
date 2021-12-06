import { Context, State } from '../@types'
import { getAllChildrenAsThoughts } from './getChildren'

/** Returns true if the given context has a child with the given value. O(children). */
const hasChild = (state: State, context: Context, value: string) =>
  !!getAllChildrenAsThoughts(state, context).find(child => child.value === value)

export default hasChild
