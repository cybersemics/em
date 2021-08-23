import { Context, State } from '../@types'
import { equalThoughtValue, unroot } from '../util'
import { getAllChildrenAsThoughts } from './getChildren'

/** Returns true if the given attribute equals the given value. O(1). Use over attribute when possible for performance. */
const attributeEquals = (state: State, context: Context, attr: string, value: string): boolean => {
  const children = getAllChildrenAsThoughts(state, [...unroot(context), attr])
  return !!children.find(equalThoughtValue(value))
}

export default attributeEquals
