import { REGEXP_HTML } from '../constants'

/** Checks if string contains html elements. */
const isHTML = (s: string) => REGEXP_HTML.test(s)

export default isHTML
