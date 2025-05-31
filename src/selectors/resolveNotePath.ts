import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import findDescendant from './findDescendant'
import { anyChild } from './getChildren'
import getThoughtById from './getThoughtById'

interface NoteKeyResult {
  noteKey: string
  noteId?: ThoughtId
}

/** Resolves note key and note id by checking for note thoughts. */
export const resolveNoteKey = (state: State, thoughtId: ThoughtId): NoteKeyResult => {
  const parentId = getThoughtById(state, thoughtId)?.parentId ?? null

  // the id of the thought's =note or the parent's =children/=note
  const noteId = findDescendant(state, thoughtId, '=note') || findDescendant(state, parentId, ['=children', '=note'])

  if (!noteId) return { noteKey: '=note' }

  const noteThought = getThoughtById(state, noteId)

  if (noteThought?.pending) return { noteKey: '=note' }

  const notePathId = findDescendant(state, noteId, '=path')
  const noteKey = anyChild(state, notePathId)?.value ?? '=note'
  return {
    noteKey,
    ...(notePathId ? {} : { noteId }),
  }
}

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)
  const { noteKey, noteId } = resolveNoteKey(state, thoughtId)
  const noteValueId = findDescendant(state, thoughtId, noteKey) ?? noteId

  return noteValueId ? appendToPath(path, noteValueId) : null
}

export default resolveNotePath
