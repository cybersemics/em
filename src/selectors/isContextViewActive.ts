import { hashContext } from '../util'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Return true if the context view is active for the given key, including selected subthoughts. */
const isContextViewActive = (state: State, context: Context) => {

  if (!context || context.length === 0) return false

  return state.contextViews[hashContext(context)]

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // TODO: Figure out why this causes unwanted re-rendering during editing
  // const { contextViews } = state
  // const subthought = perma(() => getSubthoughtUnderSelection(head(context), 3, { state }))
  // return contextViews[hashContext(context)] || (subthought() && contextViews[hashContext(contextOf(context).concat(subthought()))])
}

export default isContextViewActive
