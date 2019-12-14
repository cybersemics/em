import { hashContext } from './hashContext.js'

/** Return true if the context view is active for the given key, including selected subthoughts */
export const isContextViewActive = (thoughts, { state } = {}) => {

  if (!thoughts || thoughts.length === 0) return false

  return state.contextViews[hashContext(thoughts)]

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // TODO: Figure out why this causes unwanted re-rendering during editing
  // const { contextViews } = state
  // const subthought = perma(() => getSubthoughtUnderSelection(head(thoughts), 3, { state }))
  // return contextViews[hashContext(thoughts)] || (subthought() && contextViews[hashContext(contextOf(thoughts).concat(subthought()))])
}
