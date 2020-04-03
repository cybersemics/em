import { isMobile } from '../browser'

// constants
import {
  AUTO_PROSE_VIEW_MIN_CHARS,
} from '../constants'

// util
import {
  isURL,
} from '../util'

// selectors
import getThoughts from '../selectors/getThoughts'

const minChars = isMobile ? AUTO_PROSE_VIEW_MIN_CHARS : AUTO_PROSE_VIEW_MIN_CHARS

/** Returns true if over half of the context's children are long enough to count as prose. */
export const autoProse = (context, thoughtIndex, contextIndex, { childrenForced } = {}) => {

  // count non-URL children
  const children = (childrenForced || getThoughts({ contextIndex, thoughtIndex }, context))
    .filter(child => !isURL(child.value))

  return children.filter(child => child.value.length > minChars).length > children.length / 2
}
