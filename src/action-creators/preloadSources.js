import { store } from '../store'

// util
import {
  contextOf,
  getContexts,
  head,
  rankThoughtsFirstMatch,
} from '../util'

// action-creators
import loadResource from './loadResource'

/** Fetch and import all =src attributes with =preload */
export default async () => {

  // get a list of all =src contexts with =preload converted to paths
  const paths = getContexts('=preload')
    .filter(parent => head(parent.context) === '=src')
    .map(parent => rankThoughtsFirstMatch(contextOf(parent.context)))

  // preload sources
  paths.forEach(path => {
    store.dispatch(loadResource(path))
  })
}
