// util
import {
  attribute,
  getThoughts,
} from '../util'

// action-creators
import loadFromUrl from './loadFromUrl'
import { error } from './error'
import { newThought } from './newThought'

/** Checks =src in the given path. If it exists, load the url and import it into the given context. Set a loading status in state.resourceCache to prevent prevent redundant fetches. */
const loadResource = path => (dispatch, getState) => {

  const state = getState()
  const src = attribute(path, '=src', state)
  const children = () => getThoughts(path, state.thoughtIndex, state.contextIndex)

  if (src && !state.resourceCache[src] && children().length === 1) {

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
    loadFromUrl(src, newThoughtPath)
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
