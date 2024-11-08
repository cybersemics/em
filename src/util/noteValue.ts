import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from '../selectors/findDescendant'
import { firstVisibleChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'

/** Gets the value of a thought's note. Returns null if the thought does not have a note. */
const noteValue = (state: State, id: ThoughtId) => {
  const noteId = findDescendant(state, id, '=note')
  if (!noteId) return null
  const noteThought = getThoughtById(state, noteId)
  if (noteThought.pending) return null
  return firstVisibleChild(state, noteId!)?.value ?? null
}

export default noteValue
