import { store } from '../store.js'
import { isMobile } from '../browser.js'

// constants
import {
  AUTO_PROSE_VIEW_MIN_CHARS,
} from '../constants.js'

// util
import {
  getThoughts,
} from '../util.js'

const minChars = isMobile ? AUTO_PROSE_VIEW_MIN_CHARS : AUTO_PROSE_VIEW_MIN_CHARS

/** Returns true if at least one of the context's children is long enough to count as prose. */
export const autoProse = (context, thoughtIndex = store.getState().thoughtIndex, contextIndex = store.getState.contextIndex, { childrenForced } = {}) => {

  const children = childrenForced || getThoughts(context, thoughtIndex, contextIndex)
  return children.some(child => child.value.length > minChars)

}
