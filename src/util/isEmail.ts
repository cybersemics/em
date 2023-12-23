// Valid email addresses cannot be fully represented by regex, by this is good enough for our purposes.
// Used the regex from https://stackoverflow.com/a/46181/480608 and added a negative lookahead of http(s):// to the beginning to avoid matching http://userid@example.com.
const REGEX_EMAIL =
  /^(?!http(s)?:\/\/)(([^<>()[\].,;:\s@"]+(.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+.)+[^<>()[\].,;:\s@"]{2,})$/i

/** Checks if a string is a valid email. */
const isEmail = (s: string) => REGEX_EMAIL.test(s)

export default isEmail
