import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from './findDescendant'
import { anyChild } from './getChildren'
import getThoughtById from './getThoughtById'

interface NoteKeyResult {
  noteKey: string
  noteId?: ThoughtId
}

/** Resolves note key and note id by checking for note thoughts. */
const resolveNoteKey = (state: State, thoughtId: ThoughtId): NoteKeyResult => {
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

export default resolveNoteKey
