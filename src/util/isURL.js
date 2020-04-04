import { REGEXP_URL } from '../constants'

// checks if string contains URL
// eslint-disable-next-line no-useless-escape
export const isURL = s => REGEXP_URL.test(s)
