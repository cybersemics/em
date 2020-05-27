// util
import {
  isFunction,
  pathToContext,
} from '../util'

// action-creators
import loadFromUrl from './loadFromUrl'
import error from './error'

// selectors
import {
  attribute,
  getThoughts,
  getThoughtsRanked,
  meta,
  pathToThoughtsRanked,
} from '../selectors'

/** Checks =src in the given path. If it exists, load the url and import it into the given context. Set a loading status in state.resourceCache to prevent prevent redundant fetches. */
const loadResource = path => (dispatch, getState) => {

  const state = getState()
  const { resourceCache, showHiddenThoughts } = state
  const src = attribute(state, path, '=src')

  /** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
  const notHidden = child => !isFunction(child.value) && !meta(state, pathToContext(path).concat(child.value)).hidden

  /** Returns the children that are not hidden due to being a function or having the =hidden attribute. */
  const childrenVisible = () => {
    const children = getThoughts(state, path)
    return showHiddenThoughts
      ? children
      : children.filter(notHidden)
  }

  if (src && !resourceCache[src] && childrenVisible().length === 0) {

    // create empty thought in which to load the source
    dispatch({ type: 'newThought', at: path, insertNewSubthought: true, preventSetCursor: true })
    const parentThoughtsRanked = pathToThoughtsRanked(getState(), path)
    const childrenNew = getThoughtsRanked(getState(), pathToContext(parentThoughtsRanked))
    const thoughtNew = childrenNew[childrenNew.length - 1]
    const newThoughtPath = [...path, thoughtNew]

    /** An ad hoc action-creator to dispatch setResourceCache with the given value. */
    const setResourceCache = value =>
      dispatch({
        type: 'setResourceCache',
        key: src,
        value
      })

    // load and import into the empty thought
    // skip the root of the src to import the children directly into the new thought
    loadFromUrl(src, newThoughtPath, { skipRoot: true })
      .then(() => setResourceCache(true))
      .catch(() => {
        dispatch(error('Error loading resource: ' + src))
        setResourceCache(false)
      })

    // set the resource cache to prevent
    setResourceCache(true)
  }
}

export default loadResource
