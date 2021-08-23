import { unroot } from '../util'
import { loadResource } from '../action-creators'
import { getContextForThought, getContexts, rankThoughtsFirstMatch } from '../selectors'
import { Thunk } from '../@types'

/** Fetch and import all =src attributes with =preload. */
const preloadSources = (): Thunk => (dispatch, getState) => {
  const state = getState()

  // get a list of all =src contexts with =preload converted to paths
  const paths = getContexts(state, '=preload')
    .filter(thoughtContext => {
      const thought = state.thoughts.contextIndex[thoughtContext]
      const parentThought = state.thoughts.contextIndex[thought.parentId]
      return parentThought.value === '=src'
    })
    .map(thoughtContext => {
      const thought = state.thoughts.contextIndex[thoughtContext]
      const parentThought = state.thoughts.contextIndex[thought.parentId]
      const context = getContextForThought(state, parentThought.id)
      return rankThoughtsFirstMatch(state, unroot(context!))
    })

  // preload sources
  paths.forEach(path => {
    dispatch(loadResource(path))
  })
}

export default preloadSources
