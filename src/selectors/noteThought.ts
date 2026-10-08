import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import head from '../util/head'
import { firstVisibleChild } from './getChildren'
import resolveNoteKey from './resolveNoteKey'
import resolveNotePath from './resolveNotePath'

/**
 * Gets the thought that holds a thought's note text. Returns null if the thought has no note, or if its note is a
 * reference to other thoughts (=children/=note/=path), whose text is assembled from several thoughts and so has no
 * single thought to point at.
 */
const noteThought = (state: State, path: Path): Thought | null => {
  const { noteId } = resolveNoteKey(state, head(path))
  if (!noteId) return null

  const notePath = resolveNotePath(state, path)
  return notePath ? (firstVisibleChild(state, head(notePath)) ?? null) : null
}

export default noteThought
