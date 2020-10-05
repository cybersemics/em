import { Context } from '../types'

// util
import {
  equalThoughtValue,
  unroot,
} from '../util'

// selectors
import {
  getThoughts,
} from '../selectors'

/** Returns true if the given attribute equals the given value. O(1). Use over attribute when possible for performance. */
const attributeEquals = (state: any, context: Context, attr: string, value: string) => {
  const children = getThoughts(state, [...unroot(context), attr])
  return children.find(equalThoughtValue(value))
}

export default attributeEquals
