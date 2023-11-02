import { REGEX_URL } from '../constants'

/** Checks if string contains URL. */
const isURL = (s: string) => REGEX_URL.test(s)

export default isURL
