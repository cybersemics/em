import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import contextThoughtId from './contextThoughtId'
import contextThoughtPath from './contextThoughtPath'
import findDescendant from './findDescendant'
import resolveNoteKey from './resolveNoteKey'

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  // notes are a metaprogramming attribute of the thought the user sees, which in the context view is the context
  const thoughtId = contextThoughtId(state, path)
  const { noteKey, noteId } = resolveNoteKey(state, thoughtId)
  const noteValueId = findDescendant(state, thoughtId, noteKey) ?? noteId

  // rooted at the thought that owns the note, so the returned Path names the note's real position rather than
  // hanging it off a context-view row whose children come from a different thought
  return noteValueId ? appendToPath(contextThoughtPath(state, path), noteValueId) : null
}

export default resolveNotePath
