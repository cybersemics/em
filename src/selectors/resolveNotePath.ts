import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import findDescendant from './findDescendant'
import { findAnyChild, isVisible } from './getChildren'
import getThoughtById from './getThoughtById'
import parentOfThought from './parentOfThought'

/** Gets the parent note ID if it exists. */
const getParentNoteId = (state: State, thoughtId: ThoughtId): ThoughtId | null => {
  const parent = parentOfThought(state, thoughtId)
  const parentChildrenId = parent && findDescendant(state, parent.id, '=children')
  return parentChildrenId && findDescendant(state, parentChildrenId, '=note')
}

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)

  // if thought has a note, use it, otherwise use the parent's note
  const noteId = findDescendant(state, thoughtId, '=note') || getParentNoteId(state, thoughtId)

  if (!noteId) return null

  const noteThought = getThoughtById(state, noteId)

  if (noteThought?.pending) return null

  const pathId = findDescendant(state, noteId, '=path')
  const pathChild = pathId && findAnyChild(state, pathId, isVisible(state))
  // Resolves to a thought that is a child of `thoughtId` if the `=path` contains a descendant thought with the same value
  const targetThought = pathChild && findAnyChild(state, thoughtId, child => child.value === pathChild.value)

  // Determines the appropriate target thought to use:
  // - Uses `targetThought` if available
  // - Falls back to `pathChild` for resolving or creating a missing thought via toggleNote()
  // - Uses `noteId` as a final fallback to identify the note
  return appendToPath(path, targetThought?.id ?? pathChild?.id ?? noteId)
}

export default resolveNotePath
