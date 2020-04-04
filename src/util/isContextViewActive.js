import { store } from '../store'
import { hashContext } from './hashContext.js'

/** Return true if the context view is active for the given key, including selected subthoughts */
export const isContextViewActive = (context, { state = store.getState() } = {}) => {

  if (!context || context.length === 0) return false

  return state.contextViews[hashContext(context)]

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // TODO: Figure out why this causes unwanted re-rendering during editing
  // const { contextViews } = state
  // const subthought = perma(() => getSubthoughtUnderSelection(head(context), 3, { state }))
  // return contextViews[hashContext(context)] || (subthought() && contextViews[hashContext(contextOf(context).concat(subthought()))])
}
