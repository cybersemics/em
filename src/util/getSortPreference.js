import { store } from '../store'

// selectors
import {
  getSetting
} from '../selectors'

/** Get the sort setting from the given context meta or, if not provided, the global sort */
export const getSortPreference = contextMeta => {
  return contextMeta.sort && contextMeta.sort.length !== 0
    ? Object.keys(contextMeta.sort)
    : getSetting(store.getState(), ['Global Sort']) || 'None'
}
