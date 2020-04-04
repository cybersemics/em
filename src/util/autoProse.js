import { store } from '../store'
import { isMobile } from '../browser.js'

// constants
import {
  AUTO_PROSE_VIEW_MIN_CHARS,
} from '../constants.js'

// util
import {
  getThoughts,
  isURL,
} from '../util.js'

const minChars = isMobile ? AUTO_PROSE_VIEW_MIN_CHARS : AUTO_PROSE_VIEW_MIN_CHARS

/** Returns true if over half of the context's children are long enough to count as prose. */
export const autoProse = (context, thoughtIndex = store.getState().thoughtIndex, contextIndex = store.getState.contextIndex, { childrenForced } = {}) => {

  // count non-URL children
  const children = (childrenForced || getThoughts(context, thoughtIndex, contextIndex))
    .filter(child => !isURL(child.value))

  return children.filter(child => child.value.length > minChars).length > children.length / 2
}
