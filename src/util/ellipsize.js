import { THOUGHT_ELLIPSIZED_CHARS } from '../constants.js'

/** Return a string truncated with an ellipsis at a given limit n */
export const ellipsize = (s, n = THOUGHT_ELLIPSIZED_CHARS) =>
  // subtract 2 so that additional '...' is still within the char limit
  s.length > n - 2 ? s.slice(0, n - 2) + '...' : s
