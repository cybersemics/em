import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { firstVisibleChild } from '../selectors/getChildren'
import resolveNotePath from '../selectors/resolveNotePath'
import thoughtToPath from '../selectors/thoughtToPath'
import head from './head'

/** Gets the value of a thought's note. Returns null if the thought does not have a note. */
const noteValue = (state: State, id: ThoughtId) => {
  // Try to resolve path (checks =children first, then regular =note/=path)
  const targetPath = resolveNotePath(state, thoughtToPath(state, id))
  if (targetPath) {
    return firstVisibleChild(state, head(targetPath))?.value ?? null
  }
  return null
}

export default noteValue
