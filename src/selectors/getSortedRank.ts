import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { compare, compareReasonable, compareReasonableDescending } from '../util/compareThought'
import { getAllChildrenSorted, isVisible } from './getChildren'
import getSortPreference from './getSortPreference'
import noteValue from './noteValue'
import thoughtToPath from './thoughtToPath'

/** Calculates the rank for a value to be inserted at the given index of a comparator-sorted array of thoughts.
 * The array is sorted by the sort comparator, not by rank, so its ranks are not necessarily monotonic: duplicate (tie)
 * values are ordered by childrenMap insertion order, which can differ from their rank order (#4483). The interior rank
 * is therefore placed above every rank that sorts before the value and below every rank that sorts at or after it —
 * rather than between adjacent array positions — so that the resulting rank order contains no inversion relative to the
 * sort condition. For a well-formed monotonic array this is equivalent to the midpoint between the neighboring ranks. */
const calculateRank = (thoughts: { rank: number }[], index: number): number => {
  // if there is no such child, return the rank of the last child + 1
  if (index === -1) {
    return (thoughts[thoughts.length - 1]?.rank || 0) + 1
  }
  // if the value is less than all children, return the rank of the first child - 1
  if (index === 0) {
    return thoughts[0].rank - 1
  }
  // otherwise place the value between the highest rank that sorts before it and the lowest rank that sorts at or after it
  const lowerBound = Math.max(...thoughts.slice(0, index).map(thought => thought.rank))
  const upperBound = Math.min(...thoughts.slice(index).map(thought => thought.rank))
  return (lowerBound + upperBound) / 2
}

/** Gets the new rank of a value to be inserted into a sorted context.
 * If the sort preference is Created, then the created timestamp is the sort criteria instead.
 * This is currently optional to reflect the fact that most call sites do not need to call this function for newly-created thoughts.
 * Instead, they can assume that a newly-created thought goes at the end of the list if sort preference is Created (#3782).
 *
 * If the sort preference is Alphabetical, the old value will be represented in the list of children.
 * The staleId option can filter out that child so that the new value is not compared against the old value (#3983).
 */
const getSortedRank = (
  state: State,
  id: ThoughtId,
  value: string,
  options: { created?: number; staleId?: ThoughtId } = {},
) => {
  const children = id ? getAllChildrenSorted(state, id) : []

  if (children.length === 0) return 0

  const sortPreference = getSortPreference(state, id)
  const isDescending = sortPreference.direction === 'Desc'
  const thoughts = children.filter(thought => !state.cursor || thought.id !== state.cursor[state.cursor.length - 1])

  // Handle Updated sorting
  if (sortPreference.type === 'Updated') {
    return isDescending ? thoughts[0].rank - 1 : (thoughts[thoughts.length - 1]?.rank || 0) + 1
  }

  const { created } = options

  // Handle Created sorting (#3782)
  if (created && sortPreference.type === 'Created') {
    const index = children.findIndex(child =>
      isDescending ? compare(created, child.created) !== -1 : compare(child.created, created) !== -1,
    )
    return calculateRank(children, index)
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

  const { staleId } = options

  // For alphabetical sorting
  const childrenFiltered = staleId ? children.filter(child => child.id !== staleId) : children
  const index = childrenFiltered.findIndex(child =>
    isDescending
      ? compareReasonableDescending(child.value, value) !== -1
      : compareReasonable(child.value, value) !== -1,
  )
  return calculateRank(childrenFiltered, index)
}

export default getSortedRank
