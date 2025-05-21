import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import attribute from './attribute'
import findDescendant from './findDescendant'
import getChildren, { findAnyChild } from './getChildren'
import parentOfThought from './parentOfThought'
import thoughtToPath from './thoughtToPath'

/**
 * Finds a =children/=note in the parent of a thought.
 * Returns the note ID if found, null otherwise.
 */
const findChildrenNote = (state: State, thoughtId: ThoughtId): ThoughtId | null => {
  const parentThought = parentOfThought(state, thoughtId)
  if (!parentThought) return null

  const childrenId = findDescendant(state, parentThought.id, '=children')
  if (!childrenId) return null

  return findDescendant(state, childrenId, '=note')
}

/**
 * Checks if a thought has a valid path reference structure.
 * First checks for =children/=note/=path in parent, then checks for =note/=path in the thought itself.
 */
export const hasNotePath = (state: State, thoughtId: ThoughtId | null): boolean => {
  if (!thoughtId) return false

  // First check if parent has =children/=note with =path
  const childrenNoteId = findChildrenNote(state, thoughtId)
  if (childrenNoteId && attribute(state, childrenNoteId, '=path') !== null) {
    return true
  }

  // Then check for regular =note/=path
  const noteId = findDescendant(state, thoughtId, '=note')
  return noteId ? attribute(state, noteId, '=path') !== null : false
}

/**
 * Helper function to resolve a note path from a given base thought and note ID.
 * Handles both =children/=note references from parent and =note references from the thought itself.
 */
const resolveNoteHelper = (state: State, baseThoughtId: ThoughtId, noteId: ThoughtId): Path | null => {
  const pathValue = attribute(state, noteId, '=path')
  const parentPath = thoughtToPath(state, baseThoughtId)

  if (!pathValue) {
    // If no path, append the note ID to the parent path of the base thought
    return appendToPath(parentPath, noteId)
  }

  // Look for a child of the base thought with the path value
  const targetThought = findAnyChild(state, baseThoughtId, child => child.value === pathValue)
  if (targetThought) {
    return appendToPath(parentPath, targetThought.id)
  }

  // If no matching child, use the first child of the =path attribute
  const pathId = findDescendant(state, noteId, '=path')
  if (!pathId) return null

  const pathChildren = getChildren(state, pathId)
  if (pathChildren.length === 0) return null

  return appendToPath(parentPath, pathChildren[0].id)
}

/**
 * Resolves a note path reference for a thought.
 * Prioritizes in this order:
 * 1. =children/=note/=path structure in parent.
 * 2. =children/=note without =path in parent.
 * 3. =note/=path in the thought itself.
 * 4. Simple =note in the thought itself.
 *
 * Returns null if none of these structures exist.
 */
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)

  // 1. Check for parent's =children/=note
  const childrenNoteId = findChildrenNote(state, thoughtId)
  if (childrenNoteId) {
    return resolveNoteHelper(state, thoughtId, childrenNoteId)
  }

  // 2. Check for thought's own =note
  const noteId = findDescendant(state, thoughtId, '=note')
  if (!noteId) return null

  return resolveNoteHelper(state, thoughtId, noteId)
}

export default resolveNotePath
