import isURL from './isURL'
import stripTags from './stripTags'

/** Checks if a string contains a URL.
 * 1. Exactly equals a url.
 * 2. Contains a url in HTML tags.
 */
const containsURL = (s: string) => isURL(stripTags(s))

export default containsURL
