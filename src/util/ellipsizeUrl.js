import { URL_MAX_CHARS } from '../constants.js'
import { isURL } from '../util/isURL'

export const ellipsizeUrl = value =>
  value && isURL(value) && value.length > URL_MAX_CHARS
    ? value.substring(0, URL_MAX_CHARS) + '...'
    : value
