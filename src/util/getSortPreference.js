// util
import {
  getSetting
} from '../util.js'

/** Get the sort setting from the given context meta or, if not provided, the global sort */
export const getSortPreference = contextMeta => {
  return contextMeta.sort && contextMeta.sort.length !== 0
    ? Object.keys(contextMeta.sort)[0]
    : getSetting(['Global Sort'])[0] || 'None'
}
