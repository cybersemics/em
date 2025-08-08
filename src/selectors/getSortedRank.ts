import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { compareReasonable, compareReasonableDescending } from '../util/compareThought'
import noteValue from '../util/noteValue'
import { getAllChildrenSorted, isVisible } from './getChildren'
import getSortPreference from './getSortPreference'
import thoughtToPath from './thoughtToPath'

/** Calculates the rank for a given index in a sorted array of thoughts. */
const calculateRank = (thoughts: Thought[], index: number, id?: string): number => {
  // if there is no such child, return the rank of the last child + 1
  if (index === -1) {
    return (thoughts[thoughts.length - 1]?.rank || 0) + 1
  }
  // if the value is less than all children, return the rank of the first child - 1
  if (index === 0) {
    return thoughts[0].rank - 1
  }
  // otherwise, return the rank at the halfway point between the previous child and the next child
  // When calculating rank for a thought that's currently being sorted, we need to exclude it from the comparison
  // to avoid it interfering with its own position calculation
  let prevThought = thoughts[index - 1]
  // If the previous thought is the same as the one being sorted, use the one before it
  if (prevThought.id === id && thoughts[index - 2]) prevThought = thoughts[index - 2]

  let nextThought = thoughts[index]
  // If the next thought is the same as the one being sorted, use the one after it
  if (nextThought.id === id && thoughts[index + 1]) nextThought = thoughts[index + 1]

  return (prevThought.rank + nextThought.rank) / 2
}

/** Gets the new rank of a value to be inserted into a sorted context. */
const getSortedRank = (state: State, id: ThoughtId, value: string) => {
  const children = id ? getAllChildrenSorted(state, id) : []

  if (children.length === 0) return 0

  const sortPreference = getSortPreference(state, id)
  const isDescending = sortPreference.direction === 'Desc'
  const thoughts = children.filter(thought => !state.cursor || thought.id !== state.cursor[state.cursor.length - 1])

  let editedThought: Thought | undefined = undefined
  // Find the thought that matches the value being sorted
  // If multiple thoughts have the same value, use the most recently updated one
  // This handles edge cases where duplicate values might exist
  for (const thought of thoughts) {
    if (thought.value === value) {
      editedThought = (editedThought ? editedThought.lastUpdated : 0) > thought.lastUpdated ? editedThought : thought
    }
  }

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

  // For alphabetical sorting
  const index = children.findIndex(child => {
    const compareFn = isDescending ? compareReasonableDescending : compareReasonable
    const compareResult = compareFn(child.value, value)
    // If values are equal, use creation timestamp as a tie-breaker for consistent ordering
    // This ensures stable sorting when multiple thoughts have the same value
    return compareResult === 0
      ? compareReasonable(`${child.created}`, `${editedThought?.created}`) !== -1
      : compareResult !== -1
  })

  // Pass the edited thought's ID to exclude it from rank calculations
  // This prevents the thought from interfering with its own sorting position
  return calculateRank(children, index, editedThought?.id)
}

export default getSortedRank
