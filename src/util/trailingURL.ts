import isURL from './isURL'
import stripTags from './stripTags'

/** Returns the URL that a string ends with, or null if it does not end with a URL. Strips HTML tags before matching. Since URLs cannot contain whitespace, only the last whitespace-delimited word needs to be tested. */
const trailingURL = (s: string): string | null => {
  const lastWord = stripTags(s).trim().split(/\s+/).at(-1) ?? ''
  return isURL(lastWord) ? lastWord : null
}

export default trailingURL
