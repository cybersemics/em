const REGEX_URL =
  /^(?:http(s)?:\/\/)?(www\.)?[a-zA-Z@:%_\\+~#=]+[-\w@:%_\\+~#=.]*[\w@:%_\\+~#=]+[.:][\w()]{2,6}((\/[\w-()@:%_\\+~#?&=.]*)*)$/i

/** Checks if string contains URL. */
const isURL = (s: string) => REGEX_URL.test(s)

export default isURL
