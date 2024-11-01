import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import { errorActionCreator as error } from '../actions/error'
import { loadFromUrlActionCreator as loadFromUrl } from '../actions/loadFromUrl'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { setResourceCacheActionCreator } from '../actions/setResourceCache'
import attribute from '../selectors/attribute'
import { getChildren, getChildrenRanked } from '../selectors/getChildren'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

/** Checks =src in the given path. If it exists, load the url and import it into the given context. Set a loading status in state.resourceCache to prevent prevent redundant fetches. */
export const loadResourceActionCreator =
  (path: Path): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const { resourceCache } = state
    const src = attribute(state, head(path), '=src')

    /** Returns true if the path has any children. */
    const hasVisibleChildren = () => getChildren(state, head(path)).length > 0

    if (src && !resourceCache[src] && !hasVisibleChildren()) {
      // create empty thought in which to load the source
      dispatch(newThought({ at: path, insertNewSubthought: true, preventSetCursor: true }))

      const simplePath = simplifyPath(state, path)
      const childrenNew = getChildrenRanked(state, head(simplePath))
      const thoughtNew = childrenNew[childrenNew.length - 1]
      const newThoughtPath = appendToPath(simplePath, thoughtNew.id)

      /** An ad hoc action-creator to dispatch setResourceCacheActionCreator with the given value. */
      const setResourceCache = (value: boolean) =>
        dispatch(
          setResourceCacheActionCreator({
            key: src,
            value,
          }),
        )

      // load and import into the empty thought
      // skip the root of the src to import the children directly into the new thought
      // do not await
      dispatch(loadFromUrl(src, newThoughtPath, { skipRoot: true }))
        .then(() => setResourceCache(true))
        .catch(() => {
          dispatch(error({ value: 'Error loading resource: ' + src }))
          setResourceCache(false)
        })

      // set the resource cache to prevent
      setResourceCache(true)
    }
  }
