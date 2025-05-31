import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import findDescendant from './findDescendant'
import resolveNoteKey from './resolveNoteKey'

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)
  const { noteKey, noteId } = resolveNoteKey(state, thoughtId)
  const noteValueId = findDescendant(state, thoughtId, noteKey) ?? noteId

  return noteValueId ? appendToPath(path, noteValueId) : null
}

export default resolveNotePath
