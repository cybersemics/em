import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import { firstVisibleChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import { getPathReferenceTargetId, hasValidPathReference } from '../selectors/resolvePathReference'
import thoughtToPath from '../selectors/thoughtToPath'

/** Gets the value of a thought's note. Returns null if the thought does not have a note. */
const noteValue = (state: State, id: ThoughtId) => {
  const noteId = findDescendant(state, id, '=note')
  if (!noteId) return null
  const noteThought = getThoughtById(state, noteId)
  if (noteThought?.pending) return null
  const path = thoughtToPath(state, id)
  // If it's a path reference, find the target thought
  const thoughtId = hasValidPathReference(state, path) ? getPathReferenceTargetId(state, path) : noteId
  if (!thoughtId) return null

  return firstVisibleChild(state, thoughtId)?.value ?? null
}

export default noteValue
