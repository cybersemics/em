import Thunk from '../@types/Thunk'
import collapseContext from '../reducers/collapseContext'
import rootedParentOf from '../selectors/rootedParentOf'
import head from '../util/head'
import pull from './pull'

/** Action-creator for collapseContext. Pulls all descendants of the parent to ensure duplicates are merged correctly. */
const collapseContextActionCreator =
  ({ at }: Parameters<typeof collapseContext>[1]): Thunk =>
  async (dispatch, getState) => {
    const state = getState()
    const path = at || state.cursor

    if (!path) return

    // TODO: If the number of parent's descendants exceeds the cache size, then freeThoughts may deallocate thoughts before they get merged. Take a similar approach as importFiles and move the thoughts incrementally while pulling only one level at a time.
    await dispatch(pull([head(rootedParentOf(state, path))], { maxDepth: Infinity }))
    dispatch({ type: 'collapseContext', at })
  }

export default collapseContextActionCreator
