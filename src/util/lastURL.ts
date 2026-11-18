import { REGEX_LINK } from '../constants'
import isURL from './isURL'
import stripTags from './stripTags'

/** Returns the last URL contained in a string, or null if it does not contain a URL. A link counts as its own URL, in place of its text. Strips HTML tags before matching. Since URLs cannot contain whitespace, each whitespace-delimited word is tested as a URL. */
const lastURL = (s: string): string | null =>
  stripTags(s.replace(REGEX_LINK, ' $1 ')).split(/\s+/).filter(isURL).at(-1) ?? null

export default lastURL
