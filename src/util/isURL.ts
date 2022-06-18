import { REGEXP_URL } from '../constants'

/** Checks if string contains URL. */
const isURL = (s: string) => REGEXP_URL.test(s)

export default isURL
