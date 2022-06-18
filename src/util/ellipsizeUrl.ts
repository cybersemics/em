import { URL_MAX_CHARS } from '../constants'
import isURL from '../util/isURL'

/** Ellipsize a value if it is a url. */
const ellipsizeUrl = (value: string): string =>
  value && isURL(value) && value.length > URL_MAX_CHARS ? value.substring(0, URL_MAX_CHARS) + '...' : value

export default ellipsizeUrl
