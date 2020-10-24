import { Context } from '../types'
import { State } from '../util/initialState'
import { equalThoughtValue, unroot } from '../util'
import { getAllChildren } from '../selectors'

/** Returns true if the given attribute equals the given value. O(1). Use over attribute when possible for performance. */
const attributeEquals = (state: State, context: Context, attr: string, value: string): boolean => {
  const children = getAllChildren(state, [...unroot(context), attr])
  return !!children.find(equalThoughtValue(value))
}

export default attributeEquals
