import isEmail from './isEmail'

const REGEX_URL =
  /^(?:https?:\/\/)?(?:[^\s:@\/]+(?::[^\s:@\/]*)?@)?(?:www\.)?(?:(?:localhost)|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6})(?::\d{1,5})?(?:\/[^\s]*)?$/i

/** Checks if a string is a URL. */
const containsURL = (s: string) => REGEX_URL.test(s) && !isEmail(s)

export default containsURL
