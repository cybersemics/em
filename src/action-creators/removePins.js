import { pathToContext } from '../util'
import { hasChild } from '../selectors'

/** Removes pin attribute from an input path. */
const removePins = path => (dispatch, getState) => {
  const state = getState()
  const context = pathToContext(path)
  const pinnedTop = hasChild(state, path, '=pinnedTop')
  const pinnedBottom = hasChild(state, path, '=pinnedBottom')
  if (pinnedTop) {
    dispatch({ type: 'deleteAttribute', context, key: '=pinnedTop' })
  }
  if (pinnedBottom) {
    dispatch({ type: 'deleteAttribute', context, key: '=pinnedBottom' })
  }
}

export default removePins
