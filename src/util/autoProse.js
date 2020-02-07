import { store } from '../store.js'
import { isMobile } from '../browser.js'

// constants
import {
  AUTO_PROSE_VIEW_MIN_CHARS,
} from '../constants.js'

// util
import {
  getThoughtsRanked,
} from '../util.js'

const minChars = isMobile ? AUTO_PROSE_VIEW_MIN_CHARS : AUTO_PROSE_VIEW_MIN_CHARS

/** Returns true if over half of the context's children are long enough to count as prose. */
export const autoProse = (context, thoughtIndex = store.getState().thoughtIndex, contextIndex = store.getState.contextIndex, { childrenForced } = {}) => {

  const children = childrenForced || getThoughtsRanked(context, thoughtIndex, contextIndex)
  return children.filter(child => child.value.length > minChars).length > children.length / 2
}
