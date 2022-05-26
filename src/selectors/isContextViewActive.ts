import { head } from '../util'
import { Path, State, ThoughtId } from '../@types'

/** Return true if the context view is active for the given key, including selected subthoughts. */
const isContextViewActive = (state: State, path: Path | null) => {
  if (!path || path.length === 0) return false
  return !!state.contextViews[head(path)]

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // TODO: Figure out why this causes unwanted re-rendering during editing
  // const { contextViews } = state
  // const subthought = once(() => getSubthoughtUnderSelection(head(path), 3, { state }))
  // return contextViews[hashContext(path)] || (subthought() && contextViews[hashContext(parentOf(path).concat(subthought()))])
}

/** Return true if the context view is active for the given id, including selected subthoughts. */
export const isContextViewActiveById = (state: State, id: ThoughtId) => !!state.contextViews[id]

export default isContextViewActive
