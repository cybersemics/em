import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { compareReasonable } from '../util/compareThought'
import { getAllChildrenSorted } from './getChildren'

/** Gets the new rank of a value to be inserted into a sorted context. */
const getSortedRank = (state: State, id: ThoughtId, value: string) => {
  const children = id ? getAllChildrenSorted(state, id) : []

  // find the first child with value greater than or equal to the new value
  const index = children.findIndex(child => compareReasonable(child.value, value) !== -1)

  // if there is no such child, return the rank of the last child + 1
  return index === -1
    ? (children[children.length - 1]?.rank || 0) + 1
    : // if the value is less than all children, return the rank of the first child - 1
      index === 0
      ? children[0].rank - 1
      : // otherwise, return the rank at the halfway point between the previous child and the next child
        (children[index - 1].rank + children[index].rank) / 2
}

export default getSortedRank
