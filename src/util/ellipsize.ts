import { unescape as unescapeHtml } from 'html-escaper'
import truncate from 'truncate-html'

/** Returns a string truncated with an ellipsis at a given limit n. Defaults to 16 characters. */
const ellipsize = (s: string, n: number = 16): string =>
  // subtract 2 so that additional '...' is still within the char limit
  unescapeHtml(truncate(s, n - 2))

export default ellipsize
