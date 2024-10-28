import isEmail from './isEmail'
import stripTags from './stripTags'

const REGEX_URL =
  /^(?:http(s)?:\/\/)?(www\.)?[a-zA-Z@:%_\\+~#=]+[-\w@:%_\\+~#=.]*[\w@:%_\\+~#=]+[.:][\w()]{2,6}((\/[\w-()@:%_\\+~#?&=.]*)*)$/i

/** Checks if a string contains a URL.
 * 1. Exactly equals a url.
 * 2. Contains a url in HTML tags.
 */
const containsURL = (s: string) => {
  const strippedValue = stripTags(s)
  return REGEX_URL.test(strippedValue) && !isEmail(strippedValue)
}

export default containsURL
