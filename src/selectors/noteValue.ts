import Path from '../@types/Path'
import State from '../@types/State'
import head from '../util/head'
import { firstVisibleChild, getChildrenSorted } from './getChildren'
import resolveNoteKey from './resolveNoteKey'
import resolveNotePath from './resolveNotePath'

/** Gets the value of a thought's note. Returns null if the thought does not have a note. */
const noteValue = (state: State, path: Path) => {
  // Try to resolve path (checks =note first, then =children/=note/=path)
  const targetPath = resolveNotePath(state, path)
  if (targetPath) {
    const { noteId } = resolveNoteKey(state, head(path))
    if (noteId) return firstVisibleChild(state, head(targetPath))?.value ?? null

    const children = getChildrenSorted(state, head(targetPath))
    return children.length > 0 ? children.map(child => child.value).join(', ') : null
  }
  return null
}

export default noteValue
