
// util
import {
  pathToContext,
} from '../util'

// selectors
import {
  hasChild,
} from '../selectors'

/** Pins a thought to the bottom of sorted context. */
export default path => (dispatch, getState) => {
  const state = getState()
  const context = pathToContext(path)
  const pinnedTop = hasChild(state, path, '=pinnedTop')
  const pinnedBottom = hasChild(state, path, '=pinnedBottom')

  // Remove pin top if present
  if (pinnedTop) {
    dispatch({ type: 'deleteAttribute', context, key: '=pinnedTop' })
  }

  // check if already pinned to bottom
  if (!pinnedBottom) {
    dispatch({ type: 'newThought', at: path, insertNewSubthought: true, insertBefore: true, value: '=pinnedBottom', preventSetCursor: true })
  }
}
