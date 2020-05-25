// util
import {
  contextOf,
  head,
} from '../util'

// action-creators
import loadResource from './loadResource'

// selectors
import {
  getContexts,
  rankThoughtsFirstMatch,
} from '../selectors'

/** Fetch and import all =src attributes with =preload. */
export default async () => (dispatch, getState) => {

  const state = getState()

  // get a list of all =src contexts with =preload converted to paths
  const paths = getContexts(state, '=preload')
    .filter(parent => head(parent.context) === '=src')
    .map(parent => rankThoughtsFirstMatch(state, contextOf(parent.context)))

  // preload sources
  paths.forEach(path => {
    dispatch(loadResource(path))
  })
}
