import { encodeItems } from './encodeItems.js'

/** Return true if the context view is active for the given key, including selected subthoughts */
export const isContextViewActive = (items, { state } = {}) => {

  if (!items || items.length === 0) return false

  return state.contextViews[encodeItems(items)]

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // TODO: Figure out why this causes unwanted re-rendering during editing
  // const { contextViews } = state
  // const subthought = perma(() => getSubthoughtUnderSelection(signifier(items), 3, { state }))
  // return contextViews[encodeItems(items)] || (subthought() && contextViews[encodeItems(intersections(items).concat(subthought()))])
}
