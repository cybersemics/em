import isEmail from './isEmail'
import stripTags from './stripTags'

const REGEX_URL =
  /^(?:http(s)?:\/\/)?(www\.)?[a-zA-Z@:%_\\+~#=]+[-\w@:%_\\+~#=.]*[\w@:%_\\+~#=]+[.:][\w()]{2,6}((\/[\w-()@:%_\\+~#?&=.]*)*)$/i

/** Checks if a string is a URL. */
const isURL = (s: string) => {
  const strippedValue = stripTags(s)
  return REGEX_URL.test(strippedValue) && !isEmail(strippedValue)
}

export default isURL
