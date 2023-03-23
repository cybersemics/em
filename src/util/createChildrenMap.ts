import Index from '../@types/IndexType'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'

/** Generates an object for O(1) lookup of a thought's children. Meta attributes are keyed by value and normal are keyed by id. Missing thoughts are excluded. */
const createChildrenMap = (state: State, childrenIds: ThoughtId[]): Index<ThoughtId> =>
  keyValueBy(childIdsToThoughts(state, childrenIds), (child, i, accum) => {
    // use id as key for duplicate child attributes
    const key = child && isAttribute(child.value) && !accum[child.value] ? child.value : child.id

    return { [key]: child.id }
  })

export default createChildrenMap
