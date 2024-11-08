import Index from '../@types/IndexType'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'

/** Creates a childrenMapKey based on the value of meta thoughts and the id for non-meta thoughts. Always use the id as key if there is a duplicate meta value. */
export const childrenMapKey = (thoughtIndex: Index<ThoughtId>, child: Thought) =>
  child && isAttribute(child.value) && !thoughtIndex[child.value] ? child.value : child.id

/** Generates an object for O(1) lookup of a thought's children. Meta attributes are keyed by value and normal are keyed by id. Missing thoughts are excluded. */
const createChildrenMap = (state: State, childrenIds: ThoughtId[]): Index<ThoughtId> => {
  const children = childIdsToThoughts(state, childrenIds)
  return keyValueBy(children, (child, i, accum) => ({
    [childrenMapKey(accum, child)]: child.id,
  }))
}

export default createChildrenMap
