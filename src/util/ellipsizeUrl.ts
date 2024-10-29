import { URL_MAX_CHARS } from '../constants'
import containsURL from '../util/containsURL'

/** Ellipsize a value if it is a url. */
const ellipsizeUrl = (value: string): string =>
  value && containsURL(value) && value.length > URL_MAX_CHARS ? value.substring(0, URL_MAX_CHARS) + '...' : value

export default ellipsizeUrl
