import { unrank } from './unrank.js'
import { encodeItems } from './encodeItems.js'
import { sigRank } from './sigRank.js'

/** Returns the editable DOM node of the given items */
export const editableNode = itemsRanked => {
  const rank = sigRank(itemsRanked)
  return document.getElementsByClassName('editable-' + encodeItems(unrank(itemsRanked), rank))[0]
}
