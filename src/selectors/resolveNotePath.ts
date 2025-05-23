import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import attribute from './attribute'
import findDescendant from './findDescendant'
import getChildren, { findAnyChild } from './getChildren'
import getThoughtById from './getThoughtById'
import parentOfThought from './parentOfThought'

/** Resolves note path by checking parent's =children/=note first, then own =note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)

  // Check parent's =children/=note first
  const parent = parentOfThought(state, thoughtId)
  const parentChildrenId = parent && findDescendant(state, parent.id, '=children')
  const parentNoteId = parentChildrenId && findDescendant(state, parentChildrenId, '=note')

  // if parent has a note, use it, otherwise use the thought's own note
  const noteId = parentNoteId || findDescendant(state, thoughtId, '=note')
  if (!noteId) return null

  const noteThought = getThoughtById(state, noteId)

  if (noteThought?.pending) return null

  const pathValue = attribute(state, noteId, '=path')

  // If no path specified, link to the =note thought itself
  if (!pathValue) return appendToPath(path, noteId)

  // Find child matching path value
  const targetThought = findAnyChild(state, thoughtId, child => child.value === pathValue)
  if (targetThought) return appendToPath(path, targetThought.id)

  // If no matching child, use first child of =path attribute
  const pathChildren = getChildren(state, findDescendant(state, noteId, '=path')!)
  return pathChildren.length > 0 ? appendToPath(path, pathChildren[0].id) : null
}

export default resolveNotePath
