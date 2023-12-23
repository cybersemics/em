import isEmail from './isEmail'

const REGEX_URL =
  /^(?:http(s)?:\/\/)?(www\.)?[a-zA-Z@:%_\\+~#=]+[-\w@:%_\\+~#=.]*[\w@:%_\\+~#=]+[.:][\w()]{2,6}((\/[\w-()@:%_\\+~#?&=.]*)*)$/i

/** Checks if a string is a URL. */
const isURL = (s: string) => REGEX_URL.test(s) && !isEmail(s)

export default isURL
