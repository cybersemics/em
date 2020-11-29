import { hashContext } from '../util'
import { State } from '../util/initialState'

/** Return true if the context view is active for the given key, including selected subthoughts. */
const isContextViewActive = (state: State, unrankedPath: string[]) => {

  if (unrankedPath.length === 0) return false

  return !!state.contextViews[hashContext(unrankedPath)]

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // TODO: Figure out why this causes unwanted re-rendering during editing
  // const { contextViews } = state
  // const subthought = once(() => getSubthoughtUnderSelection(head(unrankedPath), 3, { state }))
  // return contextViews[hashContext(unrankedPath)] || (subthought() && contextViews[hashContext(parentOf(unrankedPath).concat(subthought()))])
}

export default isContextViewActive
