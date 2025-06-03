import Path from '../@types/Path'
import State from '../@types/State'
import { firstVisibleChild } from '../selectors/getChildren'
import resolveNotePath from '../selectors/resolveNotePath'
import head from './head'

/** Gets the value of a thought's note. Returns null if the thought does not have a note. */
const noteValue = (state: State, path: Path) => {
  // Try to resolve path (checks =note first, then =children/=note/=path)
  const targetPath = resolveNotePath(state, path)
  if (targetPath) {
    return firstVisibleChild(state, head(targetPath))?.value ?? null
  }
  return null
}

export default noteValue
