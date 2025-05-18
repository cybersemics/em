import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild } from '../selectors/getChildren'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

/**
 * Gets the value of a path reference attribute from a thought.
 * Returns null if the thought doesn't have a =note/=path structure.
 */
export const getPathReferenceValue = (state: State, path: Path, noteId?: ThoughtId | null): string | null => {
  const thoughtId = head(path)
  const _noteId = noteId || findDescendant(state, thoughtId, '=note')
  if (!_noteId) return null

  return attribute(state, _noteId, '=path')
}

/**
 * Finds the target thought ID referenced by a path reference if it exists.
 * Returns null if the thought doesn't have a valid path reference or the target doesn't exist.
 */
export const getPathReferenceTargetId = (state: State, path: Path, noteId?: ThoughtId | null): ThoughtId | null => {
  const pathValue = getPathReferenceValue(state, path, noteId)
  if (!pathValue) return null

  const thoughtId = head(path)
  const targetThought = findAnyChild(state, thoughtId, child => child.value === pathValue)

  return targetThought?.id || null
}

/**
 * Gets the full path to the target thought referenced by a path reference.
 * Returns null if the thought doesn't have a valid path reference or the target doesn't exist.
 */
export const getPathReferencePath = (state: State, path: Path, noteId?: ThoughtId | null): Path | null => {
  const targetId = getPathReferenceTargetId(state, path, noteId)
  if (!targetId) return null

  return appendToPath(path.length > 1 ? parentOf(path) : path, targetId)
}

/** Checks if a thought has a valid =note/=path structure, regardless of whether the referenced target exists.*/
export const hasValidPathReference = (state: State, path: Path, noteId?: ThoughtId | null): boolean => {
  return getPathReferenceValue(state, path, noteId) !== null
}

export default getPathReferenceValue
