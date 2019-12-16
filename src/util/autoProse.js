import { store } from '../store.js'
import { isMobile } from '../browser.js'

// constants
import {
  AUTO_PROSE_VIEW_MIN_CHARS_DESKTOP,
  AUTO_PROSE_VIEW_MIN_CHARS_MOBILE,
} from '../constants.js'

// util
import {
  getChildrenWithRank,
} from '../util.js'

const minChars = isMobile ? AUTO_PROSE_VIEW_MIN_CHARS_MOBILE : AUTO_PROSE_VIEW_MIN_CHARS_DESKTOP

/** Returns true if at least half of the context's children are long enough to count as prose. */
export const autoProse = (context, thoughtIndex = store.getState().thoughtIndex, contextIndex = store.getState.contextIndex, { childrenForced } = {}) => {

  const children = childrenForced || getChildrenWithRank(context, thoughtIndex, contextIndex)

  return children.length > 0 && children.reduce(
    (sum, child) => sum + (child.value.length > minChars ? 1 : 0),
    0
  ) >= children.length / 2

}