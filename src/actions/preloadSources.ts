/* eslint-disable import/prefer-default-export */
import Thunk from '../@types/Thunk'
import { loadResourceActionCreator as loadResource } from '../actions/loadResource'
import contextToPath from '../selectors/contextToPath'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToContext from '../selectors/thoughtToContext'
import unroot from '../util/unroot'

/** Fetch and import all =src attributes with =preload. */
export const preloadSourcesActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()

  // get a list of all =src contexts with =preload converted to paths
  const paths = getContexts(state, '=preload')
    .filter(thoughtContext => {
      const thought = getThoughtById(state, thoughtContext)
      if (!thought) return false
      const parentThought = getThoughtById(state, thought.parentId)
      if (!parentThought) return false
      return parentThought.value === '=src'
    })
    .map(thoughtContext => {
      const thought = getThoughtById(state, thoughtContext)
      if (!thought) return false
      const parentThought = getThoughtById(state, thought.parentId)
      if (!parentThought) return false
      const context = thoughtToContext(state, parentThought.id)
      return contextToPath(state, unroot(context!))
    })

  // preload sourcess
  paths.forEach(path => {
    if (path) {
      dispatch(loadResource(path))
    }
  })
}
