import { unescape as unescapeHtml } from 'html-escaper'
import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import stripTags from '../util/stripTags'
import findDescendant from './findDescendant'
import { filterAllChildren, getAllChildrenSorted } from './getChildren'
import resolveNoteKey from './resolveNoteKey'

/** Resolves note path by looking for a note thought, then checking the parent's =children/=note.*/
const resolveNotePath = (state: State, path: Path): Path | null => {
  const thoughtId = head(path)
  const { noteKey, noteId, notePathId } = resolveNoteKey(state, thoughtId)

  if (!notePathId) {
    const noteValueId = findDescendant(state, thoughtId, noteKey) ?? noteId
    return noteValueId ? appendToPath(path, noteValueId) : null
  }

  // Path targets match visible text, preserving distinctions beyond case and formatting.
  const key = unescapeHtml(stripTags(noteKey)).toLowerCase()
  const matches = filterAllChildren(
    state,
    thoughtId,
    child => unescapeHtml(stripTags(child.value)).toLowerCase() === key,
  )

  // Sorting by Note resolves other notes recursively; only ambiguous targets need that work.
  if (matches.length < 2) return matches[0] ? appendToPath(path, matches[0].id) : null

  const matchingIds = new Set(matches.map(child => child.id))
  const noteValueId = getAllChildrenSorted(state, thoughtId).find(child => matchingIds.has(child.id))?.id

  return noteValueId ? appendToPath(path, noteValueId) : null
}

export default resolveNotePath
