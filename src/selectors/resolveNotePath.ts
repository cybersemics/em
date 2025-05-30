import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import findDescendant from './findDescendant'
import { anyChild } from './getChildren'
import getThoughtById from './getThoughtById'

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
export const resolveNoteKey = (state: State, path: Path): string => {
  const thoughtId = head(path)
  const parentId = getThoughtById(state, thoughtId)?.parentId ?? null

  // the id of the thought's =note or the parent's =children/=note
  const noteId = findDescendant(state, thoughtId, '=note') || findDescendant(state, parentId, ['=children', '=note'])

  if (!noteId) return '=note'

  const noteThought = getThoughtById(state, noteId)
  if (noteThought?.pending) return '=note'

  // if (!notePathBase) return null
  const notePathId = findDescendant(state, noteId, '=path')
  const noteKey = anyChild(state, notePathId)?.value ?? '=note'
  return noteKey
}

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)
  const parentId = getThoughtById(state, thoughtId)?.parentId ?? null

  // the id of the thought's =note or the parent's =children/=note
  const noteId = findDescendant(state, thoughtId, '=note') || findDescendant(state, parentId, ['=children', '=note'])

  if (!noteId) return null

  const noteThought = getThoughtById(state, noteId)
  if (noteThought?.pending) return null

  // if (!notePathBase) return null
  const notePathId = findDescendant(state, noteId, '=path')
  const noteKey = anyChild(state, notePathId)?.value ?? '=note'
  const noteValueId = findDescendant(state, thoughtId, noteKey) ?? (!notePathId ? noteId : null)
  if (!noteValueId) return null

  // Determines the appropriate target thought to use:
  // - Uses `targetThought` if available
  // - Uses `noteId` as a final fallback to identify the note
  // console.log(getThoughtById(state, noteValueId)?.value)
  return appendToPath(path, noteValueId)
}

export default resolveNotePath
