import { State, ThoughtId } from '../@types'
import { findDescendant } from '../selectors'

/** Returns true if the given attribute equals the given value. O(1). Use over attribute when possible for performance. */
const attributeEquals = (state: State, parentId: ThoughtId | null, attr: string, value: string): boolean =>
  !!parentId && !!findDescendant(state, parentId, [attr, value])

export default attributeEquals
