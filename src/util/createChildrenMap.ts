import Index from '../@types/IndexType'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import isAttribute from '../util/isAttribute'

/** Serializes children by attribute value or id. Duplicate attributes use their ids, and missing thoughts are excluded. */
const createChildrenMap = (state: State, childrenIds: readonly ThoughtId[]): Index<ThoughtId> =>
  childrenIds.reduce<Index<ThoughtId>>((children, id) => {
    const child = state.thoughts.getThought(id)
    if (child) {
      const key = isAttribute(child.value) && !children[child.value] ? child.value : child.id
      children[key] = child.id
    }
    return children
  }, {})

export default createChildrenMap
