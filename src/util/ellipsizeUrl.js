import { URL_MAX_CHARS } from '../constants'
import { isURL } from '../util/isURL'

/** Ellipsize a value if it is a url */
export const ellipsizeUrl = value =>
  value && isURL(value) && value.length > URL_MAX_CHARS
    ? value.substring(0, URL_MAX_CHARS) + '...'
    : value
