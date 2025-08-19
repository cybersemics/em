import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { compareReasonable, compareReasonableDescending } from '../util/compareThought'
import noteValue from '../util/noteValue'
import { getAllChildrenSorted, isVisible } from './getChildren'
import getSortPreference from './getSortPreference'
import thoughtToPath from './thoughtToPath'

/** Calculates the rank for a given index in a sorted array of thoughts. */
const calculateRank = (thoughts: { rank: number }[], index: number): number => {
  // if there is no such child, return the rank of the last child + 1
  if (index === -1) {
    return (thoughts[thoughts.length - 1]?.rank || 0) + 1
  }
  // if the value is less than all children, return the rank of the first child - 1
  if (index === 0) {
    return thoughts[0].rank - 1
  }
  // otherwise, return the rank at the halfway point between the previous child and the next child
  return (thoughts[index - 1].rank + thoughts[index].rank) / 2
}

/** Gets the new rank of a value to be inserted into a sorted context. */
const getSortedRank = (state: State, id: ThoughtId, value: string) => {
  const children = id ? getAllChildrenSorted(state, id) : []

  if (children.length === 0) return 0

  const sortPreference = getSortPreference(state, id)
  const isDescending = sortPreference.direction === 'Desc'
  const thoughts = children.filter(thought => !state.cursor || thought.id !== state.cursor[state.cursor.length - 1])

  // Handle Created/Updated sorting
  if (sortPreference.type === 'Created' || sortPreference.type === 'Updated') {
    return isDescending ? thoughts[0].rank - 1 : (thoughts[thoughts.length - 1]?.rank || 0) + 1
  }

  // Handle Note sorting
  if (sortPreference.type === 'Note') {
    const compareFn = isDescending ? compareReasonableDescending : compareReasonable
    // Only consider visible thoughts since attributes are always sorted to the beginning.
    // Otherwise this can result in incorrectly in the wrong place, inserting after =sort.
    const thoughtsVisible = children.filter(isVisible(state))
    const index = thoughtsVisible.findIndex(
      thought => compareFn(noteValue(state, thoughtToPath(state, thought.id)) ?? '', value) !== -1,
    )
    return calculateRank(thoughtsVisible, index)
  }

  // Extract thoughts which are not same as sorting value
  const filteredThoughts = children.filter(thought => thought.value !== value)
  // For alphabetical sorting
  const index = filteredThoughts.findIndex(child =>
    isDescending
      ? compareReasonableDescending(child.value, value) !== -1
      : compareReasonable(child.value, value) !== -1,
  )

  return calculateRank(filteredThoughts, index)
}

export default getSortedRank
