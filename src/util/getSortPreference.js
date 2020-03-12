// util
import {
  getSetting
} from '../util.js'

export const getSortPreference = contextMeta => {
  return contextMeta.sort && contextMeta.sort.length !== 0 ? Object.keys(contextMeta.sort)[0] : getSetting(['Global Sort'])[0] || 'None'
}
