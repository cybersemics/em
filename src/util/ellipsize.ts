import truncate from 'truncate-html'
import { THOUGHT_ELLIPSIZED_CHARS } from '../constants'

/** Returns a string truncated with an ellipsis at a given limit n. */
const ellipsize = (s: string, n: number = THOUGHT_ELLIPSIZED_CHARS): string =>
  // subtract 2 so that additional '...' is still within the char limit
  truncate(s, n - 2)

export default ellipsize
