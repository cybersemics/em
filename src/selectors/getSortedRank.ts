import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { compareReasonable, compareReasonableDescending } from '../util/compareThought'
import { getAllChildrenSorted } from './getChildren'
import getSortPreference from './getSortPreference'

/** Gets the new rank of a value to be inserted into a sorted context. */
const getSortedRank = (state: State, id: ThoughtId, value: string) => {
  const children = id ? getAllChildrenSorted(state, id) : []

  const sortPreference = getSortPreference(state, id)
  const isDescending = sortPreference.direction === 'Desc'

  // For Created or Updated sort types, we need specific handling
  if (sortPreference.type === 'Created' || sortPreference.type === 'Updated') {
    // If there are no children, return 0 as the default rank
    if (children.length === 0) return 0
    const thoughts = children.filter(thought => !state.cursor || thought.id !== state.cursor[state.cursor.length - 1])
    // For "Updated and Created" sorting, always place at the beginning or end since this thought was just updated
    return isDescending ? thoughts[0].rank - 1 : (thoughts[thoughts.length - 1]?.rank || 0) + 1
  }

  // For alphabetical sorting, use the existing logic
  // find the first child with value greater than or equal to the new value
  const index = children.findIndex(child =>
    isDescending
      ? compareReasonableDescending(child.value, value) !== -1
      : compareReasonable(child.value, value) !== -1,
  )
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
