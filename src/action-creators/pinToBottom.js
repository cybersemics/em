
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

/** Pins a thought to the bottom of sorted context. */
export default path => (dispatch, getState) => {
  const state = getState()
  const context = pathToContext(path)
  const contextMeta = meta(state, path)

  // Remove pin top if present
  if (contextMeta.pinnedTop) {
    dispatch(deleteAttribute(context, '=pinnedTop'))
  }

  // check if already pinned to bottom
  if (!contextMeta.pinnedBottom) {
    dispatch({ type: 'newThought', at: path, insertNewSubthought: true, insertBefore: true, value: '=pinnedBottom', preventSetCursor: true })
  }
}
