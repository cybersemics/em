// util
import {
  attribute,
  getThoughts,
  isFunction,
  meta,
  pathToContext,
} from '../util'

// action-creators
import loadFromUrl from './loadFromUrl'
import { error } from './error'
import { newThought } from './newThought'

/** Checks =src in the given path. If it exists, load the url and import it into the given context. Set a loading status in state.resourceCache to prevent prevent redundant fetches. */
const loadResource = path => (dispatch, getState) => {

  const state = getState()
  const { contextIndex, resourceCache, showHiddenThoughts, thoughtIndex } = state
  const src = attribute(path, '=src', state)
  const childrenVisible = () => {
    const notHidden = child => !isFunction(child.value) && !meta(pathToContext(path).concat(child.value)).hidden
    const children = getThoughts(path, thoughtIndex, contextIndex)
    return showHiddenThoughts
      ? children
      : children.filter(notHidden)
  }

  if (src && !resourceCache[src] && childrenVisible().length === 0) {

    // create empty thought in which to load the source
    const { rank } = dispatch(newThought({ at: path, insertNewSubthought: true, preventSetCursor: true }))
    const newThoughtPath = path.concat({ value: '', rank })

    // an ad hoc action-creator to dispatch setResourceCache with the given value
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
        error('Error loading resource: ' + src)
        setResourceCache(false)
      })

    // set the resource cache to prevent
    setResourceCache(true)
  }
}

export default loadResource
