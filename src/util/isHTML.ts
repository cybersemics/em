import { REGEX_HTML } from '../constants'

/** Checks if string contains html elements. */
const isHTML = (s: string) => REGEX_HTML.test(s)

export default isHTML
