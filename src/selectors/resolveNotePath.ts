import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import findDescendant from './findDescendant'
import { findAnyChild, isVisible } from './getChildren'
import getThoughtById from './getThoughtById'

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)
  const parentId = getThoughtById(state, thoughtId)?.parentId ?? null

  // the id of the thought's =note or the parent's =children/=note
  const noteId = findDescendant(state, thoughtId, '=note') || findDescendant(state, parentId, ['=children', '=note'])

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
