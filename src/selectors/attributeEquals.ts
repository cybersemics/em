import { Child, Context } from '../types'

// util
import {
  getThoughts,
} from '../util'

/** Returns true if the given attribute equals the given value. O(1). Use over attribute when possible for performance. */
const attributeEquals = (state: any, context: Context, attr: string, value: string) => {
  const children = getThoughts(context.concat(attr), state.thoughtIndex, state.contextIndex)
  return children.find((child: Child) => child.value === value)
}

export default attributeEquals
