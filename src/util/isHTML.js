import { REGEXP_HTML } from '../constants'

// checks if string contains html elements
export const isHTML = s => REGEXP_HTML.test(s)
