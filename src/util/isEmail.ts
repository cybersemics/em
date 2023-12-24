// Valid email addresses cannot be fully represented by regex, by this is good enough for our purposes.
// See: https://stackoverflow.com/a/32686261/480608
// Performance: https://jsbench.me/q1lqle6mh4/1
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Check for https(s) to avoid matching http://userid@example.com.
const REGEX_HTTP = /^http[s]?:\/\//

/** Checks if a string is a valid email. */
const isEmail = (s: string) => REGEX_EMAIL.test(s) && !REGEX_HTTP.test(s)

export default isEmail
