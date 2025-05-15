import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild, firstVisibleChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'

/** Gets the value of a thought's note. Returns null if the thought does not have a note. */
const noteValue = (state: State, id: ThoughtId) => {
  const noteId = findDescendant(state, id, '=note')
  if (!noteId) return null
  const noteThought = getThoughtById(state, noteId)
  if (noteThought?.pending) return null

  // Check for a path reference
  const pathId = findDescendant(state, noteId, '=path')
  if (pathId) {
    const pathValue = firstVisibleChild(state, pathId)?.value
    if (!pathValue) return null

    const targetThought = findAnyChild(state, id, child => child.value === pathValue)
    if (!targetThought) return null

    return firstVisibleChild(state, targetThought.id)?.value ?? null
  }

  return firstVisibleChild(state, noteId!)?.value ?? null
}

export default noteValue
