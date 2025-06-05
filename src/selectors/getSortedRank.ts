import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import {
  compareReasonable,
  compareReasonableDescending,
  compareThoughtByNote,
  compareThoughtByNoteDescending,
} from '../util/compareThought'
import findDescendant from './findDescendant'
import { firstVisibleChild, getAllChildrenSorted } from './getChildren'
import getSortPreference from './getSortPreference'

/** Calculates the rank for a given index in a sorted array of thoughts. */
const calculateRank = (thoughts: { rank: number }[], index: number): number => {
  if (index === -1) {
    return (thoughts[thoughts.length - 1]?.rank || 0) + 1
  }
  if (index === 0) {
    return thoughts[0].rank - 1
  }
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
    const noteId = findDescendant(state, state.cursor![state.cursor!.length - 1], '=note')
    const noteThought = firstVisibleChild(state, noteId!)!
    const compareFn = isDescending ? compareThoughtByNoteDescending(state) : compareThoughtByNote(state)
    const index = thoughts.findIndex(thought => compareFn({ ...noteThought, value }, thought) === -1)
    return calculateRank(thoughts, index)
  }

  // For alphabetical sorting
  const index = children.findIndex(child =>
    isDescending
      ? compareReasonableDescending(child.value, value) !== -1
      : compareReasonable(child.value, value) !== -1,
  )
  return calculateRank(children, index)
}

export default getSortedRank
