import { ROOT_PATH_MAP } from '../constants'
import { State } from '../util/initialState'

/**
 * Get ranked or absolute ranked root based on rootContext.
 */
const getRoot = (state: State) => {
  const startingToken = state.rootContext[0]
  return ROOT_PATH_MAP[startingToken]
}

export default getRoot
