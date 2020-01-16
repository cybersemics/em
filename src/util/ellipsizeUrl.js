import { URL_MAX_CHARS } from '../constants.js'
import { isURL } from '../util/isURL'

export const ellipsizeUrl = value => {
    return value && isURL(value) ? value.substring(0, URL_MAX_CHARS) + '...' : value
}
