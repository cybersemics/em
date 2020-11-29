import { parentOf, head } from '../util'
import { loadResource } from '../action-creators'
import { getContexts, rankThoughtsFirstMatch } from '../selectors'
import { Thunk } from '../types'

/** Fetch and import all =src attributes with =preload. */
const preloadSources = (): Thunk => (dispatch, getState) => {

  const state = getState()

  // get a list of all =src contexts with =preload converted to paths
  const paths = getContexts(state, '=preload')
    .filter(parent => head(parent.context) === '=src')
    .map(parent => rankThoughtsFirstMatch(state, parentOf(parent.context)))

  // preload sources
  paths.forEach(path => {
    dispatch(loadResource(path))
  })
}

export default preloadSources
