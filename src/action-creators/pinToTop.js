
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

/** Pins a thought to the top of sorted context. */
export default path => (dispatch, getState) => {
  const state = getState()
  const context = pathToContext(path)
  const contextMeta = meta(state, path)

  // Remove pin bottom if present
  if (contextMeta.pinnedBottom) {
    dispatch(deleteAttribute(context, '=pinnedBottom'))
  }

  // check if already pinned to top
  if (!contextMeta.pinnedTop) {
    dispatch({ type: 'newThought', at: path, insertNewSubthought: true, insertBefore: true, value: '=pinnedTop', preventSetCursor: true })
  }
}
