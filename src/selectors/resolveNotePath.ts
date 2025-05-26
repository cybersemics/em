import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import attribute from './attribute'
import findDescendant from './findDescendant'
import { anyChild, findAnyChild } from './getChildren'
import getThoughtById from './getThoughtById'
import parentOfThought from './parentOfThought'

/** Gets the parent note ID if it exists. */
const getParentNoteId = (state: State, thoughtId: ThoughtId): ThoughtId | null => {
  const parent = parentOfThought(state, thoughtId)
  const parentChildrenId = parent && findDescendant(state, parent.id, '=children')
  return parentChildrenId && findDescendant(state, parentChildrenId, '=note')
}

/** Resolves the target thought ID when a path value exists. */
const resolvePathThought = (
  state: State,
  thoughtId: ThoughtId,
  noteId: ThoughtId,
  pathValue: string,
): ThoughtId | null => {
  // Find child matching path value
  const targetThought = findAnyChild(state, thoughtId, child => child.value === pathValue)
  if (targetThought) return targetThought.id

  // If no matching child, use first child of =path attribute
  const pathChildren = anyChild(state, findDescendant(state, noteId, '=path'))
  return pathChildren?.id || null
}

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)

  // if thought has a note, use it, otherwise use the parent's note
  const noteId = findDescendant(state, thoughtId, '=note') || getParentNoteId(state, thoughtId)

  if (!noteId) return null

  const noteThought = getThoughtById(state, noteId)

  if (noteThought?.pending) return null

  const pathValue = attribute(state, noteId, '=path')

  // Determine the target ID to append to the path
  const targetId = pathValue ? resolvePathThought(state, thoughtId, noteId, pathValue) : noteId // Use note directly if no path value

  return targetId ? appendToPath(path, targetId) : null
}

export default resolveNotePath
