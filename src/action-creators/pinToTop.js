
// util
import {
  pathToContext,
} from '../util'

// selectors
import {
  hasChild,
} from '../selectors'

/** Pins a thought to the top of sorted context. */
export default path => (dispatch, getState) => {
  const state = getState()
  const context = pathToContext(path)
  const pinnedTop = hasChild(state, path, '=pinnedTop')
  const pinnedBottom = hasChild(state, path, '=pinnedBottom')

  // Remove pin bottom if present
  if (pinnedBottom) {
    dispatch({ type: 'deleteAttribute', context, key: '=pinnedBottom' })
  }

  // check if already pinned to top
  if (!pinnedTop) {
    dispatch({ type: 'newThought', at: path, insertNewSubthought: true, insertBefore: true, value: '=pinnedTop', preventSetCursor: true })
  }
}
