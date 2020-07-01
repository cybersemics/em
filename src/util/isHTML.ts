import { REGEXP_HTML } from '../constants'

/** Checks if string contains html elements. */
export const isHTML = (s: string) => REGEXP_HTML.test(s)
