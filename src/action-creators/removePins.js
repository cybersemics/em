
// action creators
import deleteAttribute from '../action-creators/deleteAttribute'

// util
import {
  pathToContext,
} from '../util'

// selectors
import {
  meta,
} from '../selectors'

/** Removes pin attribute from an input path. */
export default path => (dispatch, getState) => {
  const state = getState()
  const context = pathToContext(path)
  const contextMeta = meta(state, path)
  if (contextMeta.pinnedTop) {
    dispatch(deleteAttribute(context, '=pinnedTop'))
  }
  if (contextMeta.pinnedBottom) {
    dispatch(deleteAttribute(context, '=pinnedBottom'))
  }
}
