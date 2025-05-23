import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import attribute from './attribute'
import findDescendant from './findDescendant'
import getChildren, { findAnyChild } from './getChildren'
import getThoughtById from './getThoughtById'
import parentOfThought from './parentOfThought'
import thoughtToPath from './thoughtToPath'

/** Finds the note ID for a thought by checking first in the parent's =children/=note, then in the thought's own =note. */
const findNoteId = (state: State, thoughtId: ThoughtId): ThoughtId | null => {
  // Check parent's =children/=note first
  const parent = parentOfThought(state, thoughtId)
  const parentChildrenId = parent && findDescendant(state, parent.id, '=children')
  const parentNoteId = parentChildrenId && findDescendant(state, parentChildrenId, '=note')

  return parentNoteId || findDescendant(state, thoughtId, '=note')
}

/** Resolves note path by checking parent's =children/=note first, then own =note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)
  const parentPath = thoughtToPath(state, thoughtId)

  // Get the =note thought ID
  const noteId = findNoteId(state, thoughtId)
  if (!noteId) return null

  const noteThought = getThoughtById(state, noteId)

  if (noteThought?.pending) return null

  const pathValue = attribute(state, noteId, '=path')

  // If no path specified, link to the =note thought itself
  if (!pathValue) return appendToPath(parentPath, noteId)

  // Find child matching path value
  const targetThought = findAnyChild(state, thoughtId, child => child.value === pathValue)
  if (targetThought) return appendToPath(parentPath, targetThought.id)

  // If no matching child, use first child of =path attribute
  const pathChildren = getChildren(state, findDescendant(state, noteId, '=path')!)
  return pathChildren.length > 0 ? appendToPath(parentPath, pathChildren[0].id) : null
}

export default resolveNotePath
