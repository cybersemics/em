import { contextToThoughtId } from '../util'
import { State, ThoughtId } from '../@types'

/** Return true if the context view is active for the given key, including selected subthoughts. */
const isContextViewActive = (state: State, unrankedPath: string[]) => {
  if (unrankedPath.length === 0) return false

  const id = contextToThoughtId(state, unrankedPath)

  return !!id && !!state.contextViews[id]

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // TODO: Figure out why this causes unwanted re-rendering during editing
  // const { contextViews } = state
  // const subthought = once(() => getSubthoughtUnderSelection(head(unrankedPath), 3, { state }))
  // return contextViews[hashContext(unrankedPath)] || (subthought() && contextViews[hashContext(parentOf(unrankedPath).concat(subthought()))])
}

/** Return true if the context view is active for the given id, including selected subthoughts. */
export const isContextViewActiveById = (state: State, id: ThoughtId) => !!state.contextViews[id]

export default isContextViewActive
