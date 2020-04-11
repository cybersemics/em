// util
import {
  getSetting
} from '../selectors'

/** Get the sort setting from the given context meta or, if not provided, the global sort */
export default (state, contextMeta) => {
  return contextMeta.sort && contextMeta.sort.length !== 0
    ? Object.keys(contextMeta.sort)
    : getSetting(state, ['Global Sort']) || 'None'
}
