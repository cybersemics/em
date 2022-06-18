import unroot from '../util/unroot'
import loadResource from '../action-creators/loadResource'
import thoughtToContext from '../selectors/thoughtToContext'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import contextToPath from '../selectors/contextToPath'
import Thunk from '../@types/Thunk'

/** Fetch and import all =src attributes with =preload. */
const preloadSources = (): Thunk => (dispatch, getState) => {
  const state = getState()

  // get a list of all =src contexts with =preload converted to paths
  const paths = getContexts(state, '=preload')
    .filter(thoughtContext => {
      const thought = getThoughtById(state, thoughtContext)
      const parentThought = getThoughtById(state, thought.parentId)
      return parentThought.value === '=src'
    })
    .map(thoughtContext => {
      const thought = getThoughtById(state, thoughtContext)
      const parentThought = getThoughtById(state, thought.parentId)
      const context = thoughtToContext(state, parentThought.id)
      return contextToPath(state, unroot(context!))
    })

  // preload sources
  paths.forEach(path => {
    path && dispatch(loadResource(path))
  })
}

export default preloadSources
