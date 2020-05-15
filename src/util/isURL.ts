//@ts-nocheck

import { REGEXP_URL } from '../constants'

/** Checks if string contains URL. */
export const isURL = s => REGEXP_URL.test(s)
