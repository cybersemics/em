import {
    ELLIPSIS_URL_LENGTH,
  } from '../constants.js'
import { isURL } from '../util/isURL'

export const ellipsizeUrl = value => {
    if (value && isURL(value)) {
        return value.substring(0, ELLIPSIS_URL_LENGTH) + '...'
    }
    return value
}
